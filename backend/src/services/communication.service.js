const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Communication Service - Comprehensive communication tools for teachers
 */
class CommunicationService {
  
  /**
   * Send feedback to a student
   * @param {Number} teacherId - Teacher ID
   * @param {Object} feedbackData - Feedback data
   * @returns {Promise<Object>} Sent feedback
   */
  async sendFeedback(teacherId, feedbackData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        studentId,
        courseId,
        submissionId,
        assignmentId,
        subject,
        message,
        priority = 'normal',
        sendEmail = false,
        attachments = []
      } = feedbackData;
      
      // Verify teacher has access to the student/course
      if (courseId) {
        const [accessCheck] = await connection.query(
          `SELECT c.id FROM courses c
           JOIN enrollments e ON c.id = e.course_id
           WHERE c.id = ? AND c.teacher_id = ? AND e.student_id = ? AND e.status = 'active'`,
          [courseId, teacherId, studentId]
        );
        
        if (accessCheck.length === 0) {
          throw createError(403, 'Access denied to this student/course');
        }
      }
      
      // Create notification
      const [notificationResult] = await connection.query(
        `INSERT INTO notifications 
         (recipient_id, sender_id, type, subject, message, submission_id, 
          assignment_id, course_id, priority, status, email_sent)
         VALUES (?, ?, 'feedback', ?, ?, ?, ?, ?, ?, 'sent', ?)`,
        [studentId, teacherId, subject, message, submissionId, assignmentId, 
         courseId, priority, sendEmail]
      );
      
      const notificationId = notificationResult.insertId;
      
      // Handle attachments
      if (attachments.length > 0) {
        const attachmentValues = attachments.map(file => [
          notificationId,
          file.filename,
          file.originalName,
          file.filePath,
          file.fileSize,
          file.mimeType
        ]);
        
        await connection.query(
          `INSERT INTO notification_attachments 
           (notification_id, filename, original_name, file_path, file_size, mime_type)
           VALUES ?`,
          [attachmentValues]
        );
      }
      
      await connection.commit();
      
      // Get the created notification with details
      const [sentFeedback] = await connection.query(
        `SELECT n.*, 
                CONCAT(s.first_name, ' ', s.last_name) as student_name,
                CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                c.code as course_code, c.title as course_title,
                a.title as assignment_title
         FROM notifications n
         JOIN users s ON n.recipient_id = s.id
         JOIN users t ON n.sender_id = t.id
         LEFT JOIN courses c ON n.course_id = c.id
         LEFT JOIN assignments a ON n.assignment_id = a.id
         WHERE n.id = ?`,
        [notificationId]
      );
      
      logger.info(`Feedback sent by teacher ${teacherId} to student ${studentId}`);
      
      return sentFeedback[0];
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error sending feedback:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Broadcast message to multiple students
   * @param {Number} teacherId - Teacher ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Broadcast results
   */
  async broadcastMessage(teacherId, messageData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        courseId,
        studentIds = [],
        subject,
        message,
        priority = 'normal',
        sendEmail = false,
        includeAllStudents = false
      } = messageData;
      
      // Verify course access
      const [courseCheck] = await connection.query(
        'SELECT id, title FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      let recipientIds = studentIds;
      
      // Get all students if includeAllStudents is true
      if (includeAllStudents) {
        const [allStudents] = await connection.query(
          'SELECT student_id FROM enrollments WHERE course_id = ? AND status = "active"',
          [courseId]
        );
        recipientIds = allStudents.map(student => student.student_id);
      }
      
      if (recipientIds.length === 0) {
        throw createError(400, 'No recipients specified');
      }
      
      // Create notifications for all recipients
      const notificationValues = recipientIds.map(studentId => [
        studentId,
        teacherId,
        'announcement',
        subject,
        message,
        null, // submission_id
        null, // assignment_id
        courseId,
        priority,
        'sent',
        sendEmail
      ]);
      
      await connection.query(
        `INSERT INTO notifications 
         (recipient_id, sender_id, type, subject, message, submission_id, 
          assignment_id, course_id, priority, status, email_sent)
         VALUES ?`,
        [notificationValues]
      );
      
      await connection.commit();
      
      logger.info(`Message broadcast by teacher ${teacherId} to ${recipientIds.length} students in course ${courseId}`);
      
      return {
        success: true,
        recipientCount: recipientIds.length,
        courseId,
        subject,
        priority,
        emailSent: sendEmail
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error broadcasting message:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Create course announcement
   * @param {Number} teacherId - Teacher ID
   * @param {Object} announcementData - Announcement data
   * @returns {Promise<Object>} Created announcement
   */
  async createAnnouncement(teacherId, announcementData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        courseId,
        title,
        content,
        priority = 'normal',
        isPinned = false,
        isPublished = true,
        expiresAt,
        notifyStudents = true
      } = announcementData;
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT id, title FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const course = courseCheck[0];
      
      // Create announcement
      const [announcementResult] = await connection.query(
        `INSERT INTO announcements 
         (course_id, author_id, title, content, priority, is_pinned, 
          is_published, published_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          courseId,
          teacherId,
          title,
          content,
          priority,
          isPinned,
          isPublished,
          isPublished ? new Date() : null,
          expiresAt
        ]
      );
      
      const announcementId = announcementResult.insertId;
      
      // Notify students if requested and announcement is published
      if (notifyStudents && isPublished) {
        const [enrolledStudents] = await connection.query(
          'SELECT student_id FROM enrollments WHERE course_id = ? AND status = "active"',
          [courseId]
        );
        
        if (enrolledStudents.length > 0) {
          const notificationValues = enrolledStudents.map(student => [
            student.student_id,
            teacherId,
            'announcement',
            `New Announcement: ${title}`,
            `A new announcement has been posted in ${course.title}: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
            null, // submission_id
            null, // assignment_id
            courseId,
            priority,
            'sent'
          ]);
          
          await connection.query(
            `INSERT INTO notifications 
             (recipient_id, sender_id, type, subject, message, submission_id, 
              assignment_id, course_id, priority, status)
             VALUES ?`,
            [notificationValues]
          );
        }
      }
      
      await connection.commit();
      
      // Get the created announcement with details
      const [createdAnnouncement] = await connection.query(
        `SELECT a.*, 
                CONCAT(u.first_name, ' ', u.last_name) as author_name,
                c.code as course_code, c.title as course_title
         FROM announcements a
         JOIN users u ON a.author_id = u.id
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ?`,
        [announcementId]
      );
      
      logger.info(`Announcement created: ${title} in course ${courseId} by teacher ${teacherId}`);
      
      return createdAnnouncement[0];
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating announcement:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get announcements for teacher
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Announcements with pagination
   */
  async getAnnouncements(teacherId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        courseId,
        priority,
        isPinned,
        isPublished = true,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = ['a.author_id = ?'];
      const params = [teacherId];
      
      if (courseId) {
        conditions.push('a.course_id = ?');
        params.push(courseId);
      }
      
      if (priority) {
        conditions.push('a.priority = ?');
        params.push(priority);
      }
      
      if (isPinned !== undefined) {
        conditions.push('a.is_pinned = ?');
        params.push(isPinned);
      }
      
      if (isPublished !== undefined) {
        conditions.push('a.is_published = ?');
        params.push(isPublished);
      }
      
      // Filter out expired announcements
      conditions.push('(a.expires_at IS NULL OR a.expires_at > NOW())');
      
      const whereClause = conditions.join(' AND ');
      
      // Get announcements
      const [announcements] = await pool.query(
        `SELECT a.*, 
                c.code as course_code, c.title as course_title,
                COUNT(n.id) as notification_count
         FROM announcements a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN notifications n ON n.course_id = a.course_id 
           AND n.type = 'announcement' 
           AND n.created_at >= a.created_at
           AND n.created_at <= COALESCE(a.updated_at, a.created_at)
         WHERE ${whereClause}
         GROUP BY a.id
         ORDER BY a.is_pinned DESC, ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      // Get total count
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total
         FROM announcements a
         WHERE ${whereClause}`,
        params
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      return {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      logger.error('Error getting announcements:', error);
      throw error;
    }
  }
  
  /**
   * Update announcement
   * @param {Number} announcementId - Announcement ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated announcement
   */
  async updateAnnouncement(announcementId, teacherId, updateData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify announcement ownership
      const [announcementCheck] = await connection.query(
        'SELECT * FROM announcements WHERE id = ? AND author_id = ?',
        [announcementId, teacherId]
      );
      
      if (announcementCheck.length === 0) {
        throw createError(404, 'Announcement not found or access denied');
      }
      
      const announcement = announcementCheck[0];
      
      const {
        title,
        content,
        priority,
        isPinned,
        isPublished,
        expiresAt
      } = updateData;
      
      // Prepare update fields
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      
      if (content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(content);
      }
      
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      
      if (isPinned !== undefined) {
        updateFields.push('is_pinned = ?');
        updateValues.push(isPinned);
      }
      
      if (isPublished !== undefined) {
        updateFields.push('is_published = ?');
        updateValues.push(isPublished);
        
        // Set published_at if being published
        if (isPublished && !announcement.is_published) {
          updateFields.push('published_at = NOW()');
        } else if (!isPublished) {
          updateFields.push('published_at = NULL');
        }
      }
      
      if (expiresAt !== undefined) {
        updateFields.push('expires_at = ?');
        updateValues.push(expiresAt);
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateValues.push(announcementId);
        
        await connection.query(
          `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }
      
      await connection.commit();
      
      // Get updated announcement
      const [updatedAnnouncement] = await connection.query(
        `SELECT a.*, 
                CONCAT(u.first_name, ' ', u.last_name) as author_name,
                c.code as course_code, c.title as course_title
         FROM announcements a
         JOIN users u ON a.author_id = u.id
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ?`,
        [announcementId]
      );
      
      logger.info(`Announcement updated: ${announcementId} by teacher ${teacherId}`);
      
      return updatedAnnouncement[0];
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating announcement:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Delete announcement
   * @param {Number} announcementId - Announcement ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAnnouncement(announcementId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify announcement ownership
      const [announcementCheck] = await connection.query(
        'SELECT id FROM announcements WHERE id = ? AND author_id = ?',
        [announcementId, teacherId]
      );
      
      if (announcementCheck.length === 0) {
        throw createError(404, 'Announcement not found or access denied');
      }
      
      // Delete related notifications
      await connection.query(
        'DELETE FROM notifications WHERE type = "announcement" AND created_at >= (SELECT created_at FROM announcements WHERE id = ?)',
        [announcementId]
      );
      
      // Delete announcement
      await connection.query(
        'DELETE FROM announcements WHERE id = ?',
        [announcementId]
      );
      
      await connection.commit();
      
      logger.info(`Announcement deleted: ${announcementId} by teacher ${teacherId}`);
      
      return {
        success: true,
        message: 'Announcement deleted successfully',
        announcementId
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error deleting announcement:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get messages/notifications for teacher
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Messages with pagination
   */
  async getMessages(teacherId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        courseId,
        priority,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = ['(n.sender_id = ? OR n.recipient_id = ?)'];
      const params = [teacherId, teacherId];
      
      if (type) {
        conditions.push('n.type = ?');
        params.push(type);
      }
      
      if (status) {
        conditions.push('n.status = ?');
        params.push(status);
      }
      
      if (courseId) {
        conditions.push('n.course_id = ?');
        params.push(courseId);
      }
      
      if (priority) {
        conditions.push('n.priority = ?');
        params.push(priority);
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Get messages
      const [messages] = await pool.query(
        `SELECT n.*, 
                CONCAT(s.first_name, ' ', s.last_name) as sender_name,
                CONCAT(r.first_name, ' ', r.last_name) as recipient_name,
                c.code as course_code, c.title as course_title,
                a.title as assignment_title
         FROM notifications n
         LEFT JOIN users s ON n.sender_id = s.id
         LEFT JOIN users r ON n.recipient_id = r.id
         LEFT JOIN courses c ON n.course_id = c.id
         LEFT JOIN assignments a ON n.assignment_id = a.id
         WHERE ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      // Get total count
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total
         FROM notifications n
         WHERE ${whereClause}`,
        params
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }
  
  /**
   * Batch send feedback to multiple students
   * @param {Number} teacherId - Teacher ID
   * @param {Object} batchData - Batch feedback data
   * @returns {Promise<Object>} Batch send results
   */
  async batchSendFeedback(teacherId, batchData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        courseId,
        assignmentId,
        feedbackTemplate,
        studentFeedbacks = [],
        sendEmail = false,
        priority = 'normal'
      } = batchData;
      
      // Verify course access
      const [courseCheck] = await connection.query(
        'SELECT id, title FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const results = {
        successful: [],
        failed: [],
        total: studentFeedbacks.length
      };
      
      for (const feedback of studentFeedbacks) {
        try {
          const {
            studentId,
            submissionId,
            customMessage,
            personalizations = {}
          } = feedback;
          
          // Personalize the template message
          let finalMessage = feedbackTemplate;
          Object.keys(personalizations).forEach(key => {
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), personalizations[key]);
          });
          
          if (customMessage) {
            finalMessage += '\n\n' + customMessage;
          }
          
          // Create notification
          await connection.query(
            `INSERT INTO notifications 
             (recipient_id, sender_id, type, subject, message, submission_id, 
              assignment_id, course_id, priority, status, email_sent)
             VALUES (?, ?, 'feedback', ?, ?, ?, ?, ?, ?, 'sent', ?)`,
            [
              studentId,
              teacherId,
              `Feedback: Assignment ${assignmentId ? assignmentId : 'General'}`,
              finalMessage,
              submissionId,
              assignmentId,
              courseId,
              priority,
              sendEmail
            ]
          );
          
          results.successful.push({
            studentId,
            submissionId
          });
          
        } catch (error) {
          logger.error(`Error sending feedback to student ${feedback.studentId}:`, error);
          results.failed.push({
            studentId: feedback.studentId,
            error: error.message
          });
        }
      }
      
      await connection.commit();
      
      logger.info(`Batch feedback sent by teacher ${teacherId}: ${results.successful.length} successful, ${results.failed.length} failed`);
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error in batch feedback sending:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new CommunicationService();
