const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const moment = require('moment');

/**
 * Student Support Service - Handles help requests, support tickets, and student assistance
 */
class StudentSupportService {

  /**
   * Create a new support ticket
   * @param {Number} studentId - Student ID
   * @param {Object} ticketData - Support ticket data
   * @returns {Promise<Object>} Created ticket
   */
  async createSupportTicket(studentId, ticketData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        title,
        description,
        category, // 'technical', 'academic', 'grading', 'assignment', 'account', 'other'
        priority = 'medium', // 'low', 'medium', 'high', 'urgent'
        courseId = null,
        assignmentId = null,
        submissionId = null,
        attachments = []
      } = ticketData;

      // Validate required fields
      if (!title || !description || !category) {
        throw createError(400, 'Title, description, and category are required');
      }

      // Validate category
      const validCategories = ['technical', 'academic', 'grading', 'assignment', 'account', 'other'];
      if (!validCategories.includes(category)) {
        throw createError(400, 'Invalid support category');
      }

      // Validate priority
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw createError(400, 'Invalid priority level');
      }

      // Validate course/assignment access if provided
      if (courseId) {
        const [course] = await connection.query(`
          SELECT c.id, c.title
          FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = ? AND e.student_id = ? AND e.status = 'active'
        `, [courseId, studentId]);

        if (course.length === 0) {
          throw createError(404, 'Course not found or access denied');
        }
      }

      if (assignmentId) {
        const [assignment] = await connection.query(`
          SELECT a.id, a.title
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          JOIN enrollments e ON c.id = e.course_id
          WHERE a.id = ? AND e.student_id = ? AND e.status = 'active'
        `, [assignmentId, studentId]);

        if (assignment.length === 0) {
          throw createError(404, 'Assignment not found or access denied');
        }
      }

      if (submissionId) {
        const [submission] = await connection.query(`
          SELECT s.id
          FROM submissions s
          WHERE s.id = ? AND s.student_id = ?
        `, [submissionId, studentId]);

        if (submission.length === 0) {
          throw createError(404, 'Submission not found or access denied');
        }
      }

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber(connection);

      // Create the support ticket
      const [ticketResult] = await connection.query(`
        INSERT INTO support_tickets 
        (ticket_number, student_id, title, description, category, priority, status,
         course_id, assignment_id, submission_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, NOW())
      `, [ticketNumber, studentId, title, description, category, priority, 
          courseId, assignmentId, submissionId]);

      const ticketId = ticketResult.insertId;

      // Handle attachments if provided
      if (attachments.length > 0) {
        const attachmentValues = attachments.map(attachment => [
          ticketId,
          attachment.filename,
          attachment.originalName,
          attachment.mimeType,
          attachment.size
        ]);

        await connection.query(`
          INSERT INTO support_ticket_attachments 
          (ticket_id, file_path, original_name, mime_type, file_size)
          VALUES ?
        `, [attachmentValues]);
      }

      // Create initial ticket message
      await connection.query(`
        INSERT INTO support_ticket_messages 
        (ticket_id, sender_id, sender_type, message, created_at)
        VALUES (?, ?, 'student', ?, NOW())
      `, [ticketId, studentId, description]);

      // Auto-assign based on category and priority
      const assignedTo = await this.autoAssignTicket(connection, category, priority, courseId);
      
      if (assignedTo) {
        await connection.query(`
          UPDATE support_tickets 
          SET assigned_to = ?, assigned_at = NOW()
          WHERE id = ?
        `, [assignedTo, ticketId]);

        // Create notification for assignee
        await connection.query(`
          INSERT INTO notifications 
          (user_id, title, message, type, priority, reference_id, reference_type)
          VALUES (?, ?, ?, 'support_ticket', ?, ?, 'support_ticket')
        `, [
          assignedTo,
          `New Support Ticket: ${title}`,
          `A new ${priority} priority ${category} ticket has been assigned to you.`,
          priority,
          ticketId
        ]);
      }

      // Create notification for student
      await connection.query(`
        INSERT INTO notifications 
        (user_id, title, message, type, reference_id, reference_type)
        VALUES (?, ?, ?, 'support_ticket', ?, 'support_ticket')
      `, [
        studentId,
        'Support Ticket Created',
        `Your support ticket "${title}" has been created. Ticket #${ticketNumber}`,
        ticketId
      ]);

      // Log activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description, reference_id, reference_type, metadata)
        VALUES (?, 'support_ticket_created', ?, ?, 'support_ticket', ?)
      `, [
        studentId,
        `Created support ticket: ${title}`,
        ticketId,
        JSON.stringify({ category, priority, ticket_number: ticketNumber })
      ]);

      await connection.commit();

      // Return the created ticket with details
      const [createdTicket] = await connection.query(`
        SELECT 
          st.id, st.ticket_number, st.title, st.description, st.category,
          st.priority, st.status, st.created_at, st.assigned_to,
          c.code as course_code, c.title as course_title,
          a.title as assignment_title,
          assigned_user.first_name as assigned_to_first_name,
          assigned_user.last_name as assigned_to_last_name
        FROM support_tickets st
        LEFT JOIN courses c ON st.course_id = c.id
        LEFT JOIN assignments a ON st.assignment_id = a.id
        LEFT JOIN users assigned_user ON st.assigned_to = assigned_user.id
        WHERE st.id = ?
      `, [ticketId]);

      return {
        ticket: createdTicket[0],
        message: 'Support ticket created successfully',
        estimatedResponseTime: this.getEstimatedResponseTime(priority),
        nextSteps: [
          'Your ticket has been submitted and assigned',
          'You will receive email notifications for updates',
          'You can check the status in your support dashboard'
        ]
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error creating support ticket:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to create support ticket');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's support tickets with filtering
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Support tickets
   */
  async getStudentSupportTickets(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        status, // 'open', 'in_progress', 'resolved', 'closed'
        category,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = ['st.student_id = ?'];
      const params = [studentId];

      if (status) {
        conditions.push('st.status = ?');
        params.push(status);
      }

      if (category) {
        conditions.push('st.category = ?');
        params.push(category);
      }

      if (priority) {
        conditions.push('st.priority = ?');
        params.push(priority);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [tickets] = await connection.query(`
        SELECT 
          st.id, st.ticket_number, st.title, st.description, st.category,
          st.priority, st.status, st.created_at, st.updated_at,
          st.resolved_at, st.closed_at,
          c.code as course_code, c.title as course_title,
          a.title as assignment_title,
          assigned_user.first_name as assigned_to_first_name,
          assigned_user.last_name as assigned_to_last_name,
          COUNT(stm.id) as message_count,
          COUNT(CASE WHEN stm.sender_type != 'student' AND stm.is_read = false THEN 1 END) as unread_responses,
          MAX(stm.created_at) as last_activity
        FROM support_tickets st
        LEFT JOIN courses c ON st.course_id = c.id
        LEFT JOIN assignments a ON st.assignment_id = a.id
        LEFT JOIN users assigned_user ON st.assigned_to = assigned_user.id
        LEFT JOIN support_ticket_messages stm ON st.id = stm.ticket_id
        ${whereClause}
        GROUP BY st.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Get total count
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total
        FROM support_tickets st
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get ticket statistics
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
          COUNT(CASE WHEN priority = 'urgent' AND status NOT IN ('resolved', 'closed') THEN 1 END) as urgent_open,
          AVG(CASE WHEN resolved_at IS NOT NULL THEN 
            TIMESTAMPDIFF(HOUR, created_at, resolved_at) END) as avg_resolution_time_hours
        FROM support_tickets
        WHERE student_id = ?
      `, [studentId]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        statistics: stats[0]
      };

    } catch (error) {
      logger.error('Error getting student support tickets:', error);
      throw createError(500, 'Failed to load support tickets');
    } finally {
      connection.release();
    }
  }

  /**
   * Get detailed ticket information with message history
   * @param {Number} studentId - Student ID
   * @param {Number} ticketId - Ticket ID
   * @returns {Promise<Object>} Ticket details
   */
  async getTicketDetails(studentId, ticketId) {
    const connection = await pool.getConnection();
    
    try {
      // Get ticket details
      const [ticket] = await connection.query(`
        SELECT 
          st.id, st.ticket_number, st.title, st.description, st.category,
          st.priority, st.status, st.created_at, st.updated_at,
          st.resolved_at, st.closed_at, st.assigned_at,
          c.id as course_id, c.code as course_code, c.title as course_title,
          a.id as assignment_id, a.title as assignment_title,
          s.id as submission_id,
          assigned_user.id as assigned_to_id,
          assigned_user.first_name as assigned_to_first_name,
          assigned_user.last_name as assigned_to_last_name,
          assigned_user.email as assigned_to_email
        FROM support_tickets st
        LEFT JOIN courses c ON st.course_id = c.id
        LEFT JOIN assignments a ON st.assignment_id = a.id
        LEFT JOIN submissions s ON st.submission_id = s.id
        LEFT JOIN users assigned_user ON st.assigned_to = assigned_user.id
        WHERE st.id = ? AND st.student_id = ?
      `, [ticketId, studentId]);

      if (ticket.length === 0) {
        throw createError(404, 'Support ticket not found');
      }

      const ticketData = ticket[0];

      // Get message history
      const [messages] = await connection.query(`
        SELECT 
          stm.id, stm.message, stm.sender_type, stm.created_at, stm.is_read,
          u.first_name, u.last_name, u.email,
          COUNT(stma.id) as attachment_count
        FROM support_ticket_messages stm
        LEFT JOIN users u ON stm.sender_id = u.id
        LEFT JOIN support_ticket_message_attachments stma ON stm.id = stma.message_id
        WHERE stm.ticket_id = ?
        GROUP BY stm.id
        ORDER BY stm.created_at ASC
      `, [ticketId]);

      // Get ticket attachments
      const [attachments] = await connection.query(`
        SELECT 
          id, original_name, mime_type, file_size, created_at
        FROM support_ticket_attachments
        WHERE ticket_id = ?
        ORDER BY created_at ASC
      `, [ticketId]);

      // Mark unread messages as read
      await connection.query(`
        UPDATE support_ticket_messages 
        SET is_read = true 
        WHERE ticket_id = ? AND sender_type != 'student' AND is_read = false
      `, [ticketId]);

      // Get related tickets (same category, course, or assignment)
      const [relatedTickets] = await connection.query(`
        SELECT 
          id, ticket_number, title, category, status, created_at
        FROM support_tickets
        WHERE student_id = ? AND id != ? AND (
          category = ? OR 
          course_id = ? OR 
          assignment_id = ?
        )
        ORDER BY created_at DESC
        LIMIT 5
      `, [studentId, ticketId, ticketData.category, 
          ticketData.course_id, ticketData.assignment_id]);

      return {
        ticket: ticketData,
        messages,
        attachments,
        relatedTickets,
        canAddMessage: ['open', 'in_progress'].includes(ticketData.status),
        expectedResponseTime: this.getEstimatedResponseTime(ticketData.priority)
      };

    } catch (error) {
      logger.error('Error getting ticket details:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load ticket details');
    } finally {
      connection.release();
    }
  }

  /**
   * Add message to support ticket
   * @param {Number} studentId - Student ID
   * @param {Number} ticketId - Ticket ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Added message
   */
  async addTicketMessage(studentId, ticketId, messageData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { message, attachments = [] } = messageData;

      if (!message || message.trim().length === 0) {
        throw createError(400, 'Message content is required');
      }

      // Verify ticket ownership and status
      const [ticket] = await connection.query(`
        SELECT id, status, title, assigned_to
        FROM support_tickets
        WHERE id = ? AND student_id = ?
      `, [ticketId, studentId]);

      if (ticket.length === 0) {
        throw createError(404, 'Support ticket not found');
      }

      if (['closed'].includes(ticket[0].status)) {
        throw createError(400, 'Cannot add messages to closed tickets');
      }

      // Add the message
      const [messageResult] = await connection.query(`
        INSERT INTO support_ticket_messages 
        (ticket_id, sender_id, sender_type, message, created_at)
        VALUES (?, ?, 'student', ?, NOW())
      `, [ticketId, studentId, message]);

      const messageId = messageResult.insertId;

      // Handle attachments
      if (attachments.length > 0) {
        const attachmentValues = attachments.map(attachment => [
          messageId,
          attachment.filename,
          attachment.originalName,
          attachment.mimeType,
          attachment.size
        ]);

        await connection.query(`
          INSERT INTO support_ticket_message_attachments 
          (message_id, file_path, original_name, mime_type, file_size)
          VALUES ?
        `, [attachmentValues]);
      }

      // Update ticket status if it was resolved
      if (ticket[0].status === 'resolved') {
        await connection.query(`
          UPDATE support_tickets 
          SET status = 'in_progress', resolved_at = NULL, updated_at = NOW()
          WHERE id = ?
        `, [ticketId]);
      } else {
        await connection.query(`
          UPDATE support_tickets 
          SET updated_at = NOW()
          WHERE id = ?
        `, [ticketId]);
      }

      // Notify assigned staff member
      if (ticket[0].assigned_to) {
        await connection.query(`
          INSERT INTO notifications 
          (user_id, title, message, type, priority, reference_id, reference_type)
          VALUES (?, ?, ?, 'support_ticket', 'medium', ?, 'support_ticket')
        `, [
          ticket[0].assigned_to,
          `New Message in Ticket #${ticketId}`,
          `Student added a new message to ticket: ${ticket[0].title}`,
          ticketId
        ]);
      }

      // Log activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description, reference_id, reference_type)
        VALUES (?, 'support_ticket_message_added', ?, ?, 'support_ticket')
      `, [studentId, `Added message to support ticket`, ticketId]);

      await connection.commit();

      return {
        success: true,
        messageId,
        message: 'Message added successfully',
        ticketStatus: ticket[0].status === 'resolved' ? 'in_progress' : ticket[0].status
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error adding ticket message:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to add message');
    } finally {
      connection.release();
    }
  }

  /**
   * Close support ticket (student initiated)
   * @param {Number} studentId - Student ID
   * @param {Number} ticketId - Ticket ID
   * @param {Object} closeData - Close data
   * @returns {Promise<Object>} Close result
   */
  async closeTicket(studentId, ticketId, closeData = {}) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { 
        reason = 'Issue resolved',
        satisfactionRating = null, // 1-5 scale
        feedback = null
      } = closeData;

      // Verify ticket ownership
      const [ticket] = await connection.query(`
        SELECT id, status, title, assigned_to
        FROM support_tickets
        WHERE id = ? AND student_id = ?
      `, [ticketId, studentId]);

      if (ticket.length === 0) {
        throw createError(404, 'Support ticket not found');
      }

      if (ticket[0].status === 'closed') {
        throw createError(400, 'Ticket is already closed');
      }

      // Update ticket status
      await connection.query(`
        UPDATE support_tickets 
        SET status = 'closed', closed_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [ticketId]);

      // Add closing message
      await connection.query(`
        INSERT INTO support_ticket_messages 
        (ticket_id, sender_id, sender_type, message, created_at)
        VALUES (?, ?, 'student', ?, NOW())
      `, [ticketId, studentId, `Ticket closed by student. Reason: ${reason}`]);

      // Add satisfaction rating if provided
      if (satisfactionRating !== null) {
        await connection.query(`
          INSERT INTO support_ticket_feedback 
          (ticket_id, student_id, satisfaction_rating, feedback, created_at)
          VALUES (?, ?, ?, ?, NOW())
        `, [ticketId, studentId, satisfactionRating, feedback]);
      }

      // Notify assigned staff member
      if (ticket[0].assigned_to) {
        await connection.query(`
          INSERT INTO notifications 
          (user_id, title, message, type, reference_id, reference_type)
          VALUES (?, ?, ?, 'support_ticket', 'low', ?, 'support_ticket')
        `, [
          ticket[0].assigned_to,
          `Ticket Closed by Student`,
          `Student closed ticket: ${ticket[0].title}`,
          ticketId
        ]);
      }

      // Log activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description, reference_id, reference_type, metadata)
        VALUES (?, 'support_ticket_closed', ?, ?, 'support_ticket', ?)
      `, [
        studentId,
        `Closed support ticket: ${reason}`,
        ticketId,
        JSON.stringify({ reason, satisfaction_rating: satisfactionRating })
      ]);

      await connection.commit();

      return {
        success: true,
        message: 'Support ticket closed successfully',
        closedAt: new Date(),
        feedbackSubmitted: satisfactionRating !== null
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error closing support ticket:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to close support ticket');
    } finally {
      connection.release();
    }
  }

  /**
   * Get frequently asked questions
   * @param {String} category - FAQ category (optional)
   * @returns {Promise<Object>} FAQ data
   */
  async getFAQs(category = null) {
    const connection = await pool.getConnection();
    
    try {
      const conditions = ['is_active = true'];
      const params = [];

      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [faqs] = await connection.query(`
        SELECT 
          id, question, answer, category, view_count, 
          helpful_votes, not_helpful_votes, created_at, updated_at
        FROM support_faqs
        ${whereClause}
        ORDER BY category, display_order ASC, helpful_votes DESC
      `, params);

      // Group FAQs by category
      const groupedFAQs = faqs.reduce((groups, faq) => {
        const category = faq.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(faq);
        return groups;
      }, {});

      // Get FAQ categories
      const [categories] = await connection.query(`
        SELECT DISTINCT category, COUNT(*) as faq_count
        FROM support_faqs
        WHERE is_active = true
        GROUP BY category
        ORDER BY category
      `);

      return {
        faqs: groupedFAQs,
        categories,
        totalFAQs: faqs.length
      };

    } catch (error) {
      logger.error('Error getting FAQs:', error);
      throw createError(500, 'Failed to load FAQs');
    } finally {
      connection.release();
    }
  }

  /**
   * Search support resources and FAQs
   * @param {String} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Search results
   */
  async searchSupportResources(query, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const { category, type = 'all' } = filters; // type: 'faq', 'guide', 'all'

      // Search FAQs
      let faqResults = [];
      if (type === 'all' || type === 'faq') {
        const faqConditions = ['is_active = true'];
        const faqParams = [];

        if (category) {
          faqConditions.push('category = ?');
          faqParams.push(category);
        }

        if (query) {
          faqConditions.push('(question LIKE ? OR answer LIKE ?)');
          const searchTerm = `%${query}%`;
          faqParams.push(searchTerm, searchTerm);
        }

        const [faqs] = await connection.query(`
          SELECT 
            id, question, answer, category, 'faq' as result_type,
            MATCH(question, answer) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
          FROM support_faqs
          WHERE ${faqConditions.join(' AND ')}
          ORDER BY relevance DESC, helpful_votes DESC
          LIMIT 20
        `, [query || '', ...faqParams]);

        faqResults = faqs;
      }

      // Search support guides (if you have them)
      let guideResults = [];
      if (type === 'all' || type === 'guide') {
        // Placeholder for support guides search
        // You would implement this based on your support guides structure
      }

      // Combine results
      const allResults = [
        ...faqResults.map(r => ({ ...r, result_type: 'faq' })),
        ...guideResults.map(r => ({ ...r, result_type: 'guide' }))
      ];

      // Sort by relevance
      allResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      return {
        results: allResults.slice(0, 20),
        totalResults: allResults.length,
        query,
        suggestions: this.generateSearchSuggestions(query, allResults.length)
      };

    } catch (error) {
      logger.error('Error searching support resources:', error);
      throw createError(500, 'Failed to search support resources');
    } finally {
      connection.release();
    }
  }

  /**
   * Generate unique ticket number
   * @param {Object} connection - Database connection
   * @returns {Promise<String>} Ticket number
   */
  async generateTicketNumber(connection) {
    const prefix = 'ST'; // Support Ticket
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get last ticket number for the month
    const [lastTicket] = await connection.query(`
      SELECT ticket_number 
      FROM support_tickets 
      WHERE ticket_number LIKE ? 
      ORDER BY id DESC 
      LIMIT 1
    `, [`${prefix}${year}${month}%`]);

    let sequence = 1;
    if (lastTicket.length > 0) {
      const lastNumber = lastTicket[0].ticket_number;
      const lastSequence = parseInt(lastNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${year}${month}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Auto-assign ticket based on category and priority
   * @param {Object} connection - Database connection
   * @param {String} category - Ticket category
   * @param {String} priority - Ticket priority
   * @param {Number} courseId - Course ID (optional)
   * @returns {Promise<Number|null>} Assigned user ID
   */
  async autoAssignTicket(connection, category, priority, courseId = null) {
    try {
      // For course-specific issues, try to assign to course teacher first
      if (courseId && ['academic', 'grading', 'assignment'].includes(category)) {
        const [teacher] = await connection.query(`
          SELECT teacher_id
          FROM courses
          WHERE id = ?
        `, [courseId]);

        if (teacher.length > 0) {
          return teacher[0].teacher_id;
        }
      }

      // Auto-assign based on category to available staff
      // This would be customized based on your staffing structure
      const categoryAssignments = {
        'technical': 'admin', // Technical support staff
        'academic': 'teacher', // Academic staff
        'grading': 'teacher', // Teachers
        'assignment': 'teacher', // Teachers
        'account': 'admin', // Admin staff
        'other': 'admin' // Default to admin
      };

      const roleToAssign = categoryAssignments[category] || 'admin';

      // Find available staff member with lowest current workload
      const [assignee] = await connection.query(`
        SELECT 
          u.id,
          COUNT(st.id) as current_tickets
        FROM users u
        LEFT JOIN support_tickets st ON u.id = st.assigned_to AND st.status IN ('open', 'in_progress')
        WHERE u.role = ? AND u.is_active = true
        GROUP BY u.id
        ORDER BY current_tickets ASC, RAND()
        LIMIT 1
      `, [roleToAssign]);

      return assignee.length > 0 ? assignee[0].id : null;

    } catch (error) {
      logger.error('Error auto-assigning ticket:', error);
      return null;
    }
  }

  /**
   * Get estimated response time based on priority
   * @param {String} priority - Ticket priority
   * @returns {String} Estimated response time
   */
  getEstimatedResponseTime(priority) {
    const responseTimeMap = {
      'urgent': '2-4 hours',
      'high': '4-8 hours',
      'medium': '1-2 business days',
      'low': '2-3 business days'
    };

    return responseTimeMap[priority] || '2-3 business days';
  }

  /**
   * Generate search suggestions
   * @param {String} query - Search query
   * @param {Number} resultCount - Number of results found
   * @returns {Array} Search suggestions
   */
  generateSearchSuggestions(query, resultCount) {
    const suggestions = [];

    if (resultCount === 0) {
      suggestions.push('Try using different keywords');
      suggestions.push('Check your spelling');
      suggestions.push('Use more general terms');
      suggestions.push('Browse our FAQ categories');
    } else if (resultCount < 3) {
      suggestions.push('Try related keywords');
      suggestions.push('Browse our FAQ categories for more information');
    }

    return suggestions;
  }
}

module.exports = new StudentSupportService();
