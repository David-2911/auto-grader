const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

/**
 * Notification Service - Handles communication between teachers and students
 */
class NotificationService {

  constructor() {
    // Initialize email transporter
  this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send feedback to a student
   * @param {Object} feedbackData - Feedback data
   * @returns {Promise<Object>} Send result
   */
  async sendFeedback(feedbackData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        studentId,
        senderId,
        subject,
        message,
        submissionId = null,
        assignmentId = null,
        courseId = null,
        priority = 'normal',
        sendEmail = true
      } = feedbackData;
      
      // Verify sender is a teacher
      const [senderCheck] = await connection.query(
        'SELECT * FROM users WHERE id = ? AND role IN ("teacher", "admin")',
        [senderId]
      );
      
      if (senderCheck.length === 0) {
        throw createError(403, 'Only teachers can send feedback');
      }
      
      // Get student details
      const [student] = await connection.query(
        'SELECT * FROM users WHERE id = ? AND role = "student"',
        [studentId]
      );
      
      if (student.length === 0) {
        throw createError(404, 'Student not found');
      }
      
      // Store notification in database
      const [notificationResult] = await connection.query(
        `INSERT INTO notifications 
         (recipient_id, sender_id, type, subject, message, submission_id, assignment_id, course_id, priority, status)
         VALUES (?, ?, 'feedback', ?, ?, ?, ?, ?, ?, 'sent')`,
        [studentId, senderId, subject, message, submissionId, assignmentId, courseId, priority]
      );
      
      const notificationId = notificationResult.insertId;
      
      // Send email if requested
      if (sendEmail && student[0].email) {
        try {
          await this.sendEmailNotification({
            to: student[0].email,
            subject: subject,
            message: message,
            studentName: `${student[0].first_name} ${student[0].last_name}`,
            teacherName: `${senderCheck[0].first_name} ${senderCheck[0].last_name}`,
            type: 'feedback'
          });
          
          await connection.query(
            'UPDATE notifications SET email_sent = true, email_sent_at = NOW() WHERE id = ?',
            [notificationId]
          );
          
        } catch (emailError) {
          logger.error('Error sending email notification:', emailError);
          // Don't fail the entire operation if email fails
        }
      }
      
      await connection.commit();
      
      logger.info(`Feedback sent from teacher ${senderId} to student ${studentId}`);
      
      return {
        notificationId,
        status: 'sent',
        emailSent: sendEmail
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error sending feedback:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Broadcast message to all students in a course
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastMessage(messageData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        courseId,
        senderId,
        subject,
        message,
        priority = 'normal',
        sendEmail = true,
        studentIds = null // Optional: specific students
      } = messageData;
      
      // Verify sender is teacher of the course
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, senderId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(403, 'Permission denied to broadcast to this course');
      }
      
      // Get target students
      let studentsQuery = `
        SELECT u.* FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = ? AND e.status = 'active' AND u.role = 'student'
      `;
      
      const queryParams = [courseId];
      
      if (studentIds && studentIds.length > 0) {
        studentsQuery += ` AND u.id IN (${studentIds.map(() => '?').join(',')})`;
        queryParams.push(...studentIds);
      }
      
      const [students] = await connection.query(studentsQuery, queryParams);
      
      if (students.length === 0) {
        throw createError(404, 'No students found in the course');
      }
      
      const broadcastResults = {
        totalStudents: students.length,
        notificationsSent: 0,
        emailsSent: 0,
        failed: []
      };
      
      // Send notification to each student
      for (const student of students) {
        try {
          const [notificationResult] = await connection.query(
            `INSERT INTO notifications 
             (recipient_id, sender_id, type, subject, message, course_id, priority, status)
             VALUES (?, ?, 'announcement', ?, ?, ?, ?, 'sent')`,
            [student.id, senderId, subject, message, courseId, priority]
          );
          
          broadcastResults.notificationsSent++;
          
          // Send email if requested
          if (sendEmail && student.email) {
            try {
              await this.sendEmailNotification({
                to: student.email,
                subject: subject,
                message: message,
                studentName: `${student.first_name} ${student.last_name}`,
                courseName: courseCheck[0].title,
                type: 'announcement'
              });
              
              await connection.query(
                'UPDATE notifications SET email_sent = true, email_sent_at = NOW() WHERE id = ?',
                [notificationResult.insertId]
              );
              
              broadcastResults.emailsSent++;
              
            } catch (emailError) {
              logger.error(`Error sending email to ${student.email}:`, emailError);
            }
          }
          
        } catch (error) {
          broadcastResults.failed.push({
            studentId: student.id,
            studentEmail: student.email,
            error: error.message
          });
        }
      }
      
      await connection.commit();
      
      logger.info(`Message broadcasted to course ${courseId}: ${broadcastResults.notificationsSent} notifications sent`);
      
      return broadcastResults;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error broadcasting message:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Send grade notification to student
   * @param {Object} gradeData - Grade notification data
   * @returns {Promise<void>}
   */
  async sendGradeNotification(gradeData) {
    const connection = await pool.getConnection();
    
    try {
      const {
        studentId,
        studentEmail,
        studentName,
        assignmentTitle,
        grade,
        totalPoints,
        feedback,
        isAutoGraded = false
      } = gradeData;
      
      const subject = `Grade Available: ${assignmentTitle}`;
      const percentage = ((grade / totalPoints) * 100).toFixed(1);
      
      let message = `Your assignment "${assignmentTitle}" has been graded.\n\n`;
      message += `Grade: ${grade}/${totalPoints} (${percentage}%)\n\n`;
      
      if (feedback) {
        message += `Feedback:\n${feedback}\n\n`;
      }
      
      if (isAutoGraded) {
        message += 'This assignment was automatically graded. If you have questions about your grade, please contact your instructor.\n\n';
      }
      
      message += 'You can view your detailed results by logging into the course portal.';
      
      // Store notification
      await connection.query(
        `INSERT INTO notifications 
         (recipient_id, type, subject, message, status, created_at)
         VALUES (?, 'grade', ?, ?, 'sent', NOW())`,
        [studentId, subject, message]
      );
      
      // Send email
      if (studentEmail) {
        await this.sendEmailNotification({
          to: studentEmail,
          subject: subject,
          message: message,
          studentName: studentName,
          type: 'grade',
          grade: grade,
          totalPoints: totalPoints,
          percentage: percentage
        });
      }
      
    } catch (error) {
      logger.error('Error sending grade notification:', error);
      // Don't throw here as this is often called from other operations
    } finally {
      connection.release();
    }
  }

  /**
   * Send email notification
   * @param {Object} emailData - Email data
   * @returns {Promise<void>}
   */
  async sendEmailNotification(emailData) {
    try {
      const {
        to,
        subject,
        message,
        studentName,
        teacherName,
        courseName,
        type,
        grade,
        totalPoints,
        percentage
      } = emailData;
      
      let htmlContent = '';
      let textContent = '';
      
      // Generate email content based on type
      switch (type) {
        case 'feedback':
          htmlContent = this.generateFeedbackEmailHTML(message, studentName, teacherName);
          textContent = message;
          break;
          
        case 'announcement':
          htmlContent = this.generateAnnouncementEmailHTML(message, studentName, courseName);
          textContent = message;
          break;
          
        case 'grade':
          htmlContent = this.generateGradeEmailHTML(message, studentName, grade, totalPoints, percentage);
          textContent = message;
          break;
          
        default:
          htmlContent = `<div style="font-family: Arial, sans-serif;"><p>Dear ${studentName},</p><p>${message.replace(/\n/g, '<br>')}</p></div>`;
          textContent = message;
      }
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@autograde.com',
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      logger.info(`Email sent to ${to}: ${subject}`);
      
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {Number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications data
   */
  async getNotifications(userId, options = {}) {
    try {
      const connection = await pool.getConnection();
      const { page = 1, limit = 20, type, status, unreadOnly = false } = options;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT n.*, 
               CONCAT(sender.first_name, ' ', sender.last_name) as sender_name,
               c.title as course_title,
               a.title as assignment_title
        FROM notifications n
        LEFT JOIN users sender ON n.sender_id = sender.id
        LEFT JOIN courses c ON n.course_id = c.id
        LEFT JOIN assignments a ON n.assignment_id = a.id
        WHERE n.recipient_id = ?
      `;
      
      const queryParams = [userId];
      
      if (type) {
        query += ' AND n.type = ?';
        queryParams.push(type);
      }
      
      if (status) {
        query += ' AND n.status = ?';
        queryParams.push(status);
      }
      
      if (unreadOnly) {
        query += ' AND n.read_at IS NULL';
      }
      
      query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      const [notifications] = await connection.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE recipient_id = ?';
      const countParams = [userId];
      
      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }
      
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      
      if (unreadOnly) {
        countQuery += ' AND read_at IS NULL';
      }
      
      const [totalCount] = await connection.query(countQuery, countParams);
      
      connection.release();
      
      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {Number} notificationId - Notification ID
   * @param {Number} userId - User ID
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId, userId) {
    try {
      const connection = await pool.getConnection();
      
      await connection.query(
        'UPDATE notifications SET read_at = NOW() WHERE id = ? AND recipient_id = ?',
        [notificationId, userId]
      );
      
      connection.release();
      
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Generate feedback email HTML
   * @param {String} message - Message content
   * @param {String} studentName - Student name
   * @param {String} teacherName - Teacher name
   * @returns {String} HTML content
   */
  generateFeedbackEmailHTML(message, studentName, teacherName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Feedback from Your Instructor</h2>
          <p style="color: #555; font-size: 16px;">Dear ${studentName},</p>
          <p style="color: #555; font-size: 16px;">You have received feedback from ${teacherName}:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; border-radius: 4px;">
            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="color: #555; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Auto-Grade System
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate announcement email HTML
   * @param {String} message - Message content
   * @param {String} studentName - Student name
   * @param {String} courseName - Course name
   * @returns {String} HTML content
   */
  generateAnnouncementEmailHTML(message, studentName, courseName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Course Announcement</h2>
          <p style="color: #555; font-size: 16px;">Dear ${studentName},</p>
          <p style="color: #555; font-size: 16px;">There's a new announcement for <strong>${courseName}</strong>:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #e74c3c; margin: 20px 0; border-radius: 4px;">
            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="color: #555; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Auto-Grade System
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate grade email HTML
   * @param {String} message - Message content
   * @param {String} studentName - Student name
   * @param {Number} grade - Grade received
   * @param {Number} totalPoints - Total possible points
   * @param {Number} percentage - Grade percentage
   * @returns {String} HTML content
   */
  generateGradeEmailHTML(message, studentName, grade, totalPoints, percentage) {
    const gradeColor = percentage >= 90 ? '#27ae60' : percentage >= 70 ? '#f39c12' : '#e74c3c';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Grade Available</h2>
          <p style="color: #555; font-size: 16px;">Dear ${studentName},</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #2c3e50; margin: 0 0 10px 0;">Your Grade</h3>
            <div style="font-size: 36px; font-weight: bold; color: ${gradeColor}; margin: 10px 0;">
              ${grade}/${totalPoints}
            </div>
            <div style="font-size: 24px; color: ${gradeColor};">
              ${percentage}%
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; border-radius: 4px;">
            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="color: #555; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Auto-Grade System
          </p>
        </div>
      </div>
    `;
  }
}

module.exports = new NotificationService();
