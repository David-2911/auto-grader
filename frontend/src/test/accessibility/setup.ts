/**
 * Accessibility Testing Setup and Utilities
 * Provides helper functions and configurations for accessibility testing
 */

import { configure } from '@testing-library/react';
import { configureAxe } from 'jest-axe';

// Configure testing library for better accessibility testing
configure({
  // Custom test ID attribute for better accessibility testing
  testIdAttribute: 'data-testid',
  
  // Configure queries to prioritize accessible elements
  defaultHidden: true,
  
  // Set up better error messages for accessibility issues
  getElementError: (message, container) => {
    const error = new Error(message);
    error.name = 'AccessibilityTestingError';
    error.stack = `${message}\n\nAccessible elements available:\n${container.innerHTML}`;
    return error;
  }
});

// Configure axe for comprehensive accessibility testing
export const axeConfig = configureAxe({
  rules: {
    // Core accessibility rules
    'area-alt': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-labelledby': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    
    // Color and contrast
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    
    // Focus management
    'focus-order-semantics': { enabled: true },
    'focusable-content': { enabled: true },
    
    // Form accessibility
    'form-field-multiple-labels': { enabled: true },
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    
    // Heading structure
    'heading-order': { enabled: true },
    'empty-heading': { enabled: true },
    
    // Image accessibility
    'image-alt': { enabled: true },
    'image-redundant-alt': { enabled: true },
    
    // Keyboard accessibility
    'keyboard': { enabled: true },
    'no-keyboard-trap': { enabled: true },
    
    // Language
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    
    // Link accessibility
    'link-name': { enabled: true },
    'link-in-text-block': { enabled: true },
    
    // Lists
    'list': { enabled: true },
    'listitem': { enabled: true },
    
    // Page structure
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'skip-link': { enabled: true },
    
    // Tables
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    
    // Custom rules for educational platforms
    'landmark-one-main': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true }
  },
  
  // Tags for educational technology accessibility
  tags: ['wcag2a', 'wcag2aa', 'section508', 'best-practice']
});

/**
 * Custom accessibility testing utilities
 */
export class AccessibilityTestUtils {
  /**
   * Test keyboard navigation through a component
   */
  static async testKeyboardNavigation(user: any, container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const results = {
      totalElements: focusableElements.length,
      navigableElements: 0,
      issues: [] as string[]
    };
    
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab();
      const activeElement = document.activeElement;
      
      if (activeElement === focusableElements[i]) {
        results.navigableElements++;
      } else {
        results.issues.push(`Element ${i} not reachable via keyboard navigation`);
      }
    }
    
    return results;
  }
  
  /**
   * Test screen reader announcements
   */
  static testScreenReaderAnnouncements(container: HTMLElement) {
    const liveRegions = container.querySelectorAll('[aria-live]');
    const alerts = container.querySelectorAll('[role="alert"]');
    const status = container.querySelectorAll('[role="status"]');
    
    return {
      liveRegions: Array.from(liveRegions).map(el => ({
        element: el.tagName,
        ariaLive: el.getAttribute('aria-live'),
        content: el.textContent?.trim()
      })),
      alerts: Array.from(alerts).map(el => ({
        element: el.tagName,
        content: el.textContent?.trim()
      })),
      status: Array.from(status).map(el => ({
        element: el.tagName,
        content: el.textContent?.trim()
      }))
    };
  }
  
  /**
   * Validate ARIA attributes
   */
  static validateAriaAttributes(container: HTMLElement) {
    const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-label]');
    const issues = [] as string[];
    
    elementsWithAria.forEach(element => {
      // Check aria-labelledby references
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const referencedElement = document.getElementById(labelledBy);
        if (!referencedElement) {
          issues.push(`aria-labelledby references non-existent element: ${labelledBy}`);
        }
      }
      
      // Check aria-describedby references
      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        const referencedElement = document.getElementById(describedBy);
        if (!referencedElement) {
          issues.push(`aria-describedby references non-existent element: ${describedBy}`);
        }
      }
      
      // Check for empty aria-label
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel !== null && ariaLabel.trim() === '') {
        issues.push('Empty aria-label found');
      }
    });
    
    return {
      totalElementsWithAria: elementsWithAria.length,
      issues
    };
  }
  
  /**
   * Check heading hierarchy
   */
  static checkHeadingHierarchy(container: HTMLElement) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const hierarchy = Array.from(headings).map(heading => ({
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent?.trim(),
      element: heading
    }));
    
    const issues = [] as string[];
    
    // Check for h1
    if (hierarchy.length > 0 && hierarchy[0].level !== 1) {
      issues.push('Page should start with h1');
    }
    
    // Check for skipped levels
    for (let i = 1; i < hierarchy.length; i++) {
      const currentLevel = hierarchy[i].level;
      const previousLevel = hierarchy[i - 1].level;
      
      if (currentLevel > previousLevel + 1) {
        issues.push(`Heading level skipped: h${previousLevel} to h${currentLevel}`);
      }
    }
    
    return {
      hierarchy,
      issues
    };
  }
  
  /**
   * Test form accessibility
   */
  static testFormAccessibility(form: HTMLFormElement) {
    const formElements = form.querySelectorAll('input, select, textarea');
    const issues = [] as string[];
    
    formElements.forEach(element => {
      const id = element.getAttribute('id');
      const name = element.getAttribute('name');
      
      // Check for labels
      const label = form.querySelector(`label[for="${id}"]`);
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      
      if (!label && !ariaLabel && !ariaLabelledBy) {
        issues.push(`Form element ${element.tagName} lacks proper labeling`);
      }
      
      // Check required fields have proper indication
      if (element.hasAttribute('required')) {
        const requiredIndication = 
          element.getAttribute('aria-required') === 'true' ||
          label?.textContent?.includes('*') ||
          label?.textContent?.includes('required');
          
        if (!requiredIndication) {
          issues.push(`Required field ${name || id} lacks proper indication`);
        }
      }
      
      // Check error states
      const ariaInvalid = element.getAttribute('aria-invalid');
      if (ariaInvalid === 'true') {
        const ariaDescribedBy = element.getAttribute('aria-describedby');
        const errorElement = ariaDescribedBy ? 
          document.getElementById(ariaDescribedBy) : null;
          
        if (!errorElement) {
          issues.push(`Invalid field ${name || id} lacks error message`);
        }
      }
    });
    
    return {
      totalFormElements: formElements.length,
      issues
    };
  }
  
  /**
   * Test table accessibility
   */
  static testTableAccessibility(table: HTMLTableElement) {
    const issues = [] as string[];
    
    // Check for caption or summary
    const caption = table.querySelector('caption');
    const summary = table.getAttribute('summary');
    const ariaLabel = table.getAttribute('aria-label');
    const ariaLabelledBy = table.getAttribute('aria-labelledby');
    
    if (!caption && !summary && !ariaLabel && !ariaLabelledBy) {
      issues.push('Table lacks proper description (caption, summary, or aria-label)');
    }
    
    // Check headers
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
      const scope = header.getAttribute('scope');
      if (!scope) {
        issues.push('Table header lacks scope attribute');
      }
    });
    
    // Check for header associations
    const cells = table.querySelectorAll('td');
    cells.forEach(cell => {
      const headers = cell.getAttribute('headers');
      const scope = cell.getAttribute('scope');
      
      if (!headers && !scope && table.querySelectorAll('th').length > 0) {
        // Complex tables should have header associations
        const rowHeaders = table.querySelectorAll('th[scope="row"]');
        const colHeaders = table.querySelectorAll('th[scope="col"]');
        
        if (rowHeaders.length > 0 || colHeaders.length > 0) {
          issues.push('Complex table cell lacks header association');
        }
      }
    });
    
    return {
      totalHeaders: headers.length,
      totalCells: cells.length,
      issues
    };
  }
}

/**
 * Accessibility test matchers
 */
export const accessibilityMatchers = {
  toBeAccessible: async (received: HTMLElement) => {
    const { axe } = await import('jest-axe');
    const results = await axe(received, axeConfig);
    
    const pass = results.violations.length === 0;
    
    if (pass) {
      return {
        message: () => `Expected element to have accessibility violations, but none were found`,
        pass: true
      };
    } else {
      const violations = results.violations.map(violation => 
        `${violation.id}: ${violation.description}`
      ).join('\n');
      
      return {
        message: () => `Expected element to be accessible, but found violations:\n${violations}`,
        pass: false
      };
    }
  },
  
  toHaveProperHeadingStructure: (received: HTMLElement) => {
    const result = AccessibilityTestUtils.checkHeadingHierarchy(received);
    const pass = result.issues.length === 0;
    
    if (pass) {
      return {
        message: () => `Expected element to have heading structure issues, but none were found`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected element to have proper heading structure, but found issues:\n${result.issues.join('\n')}`,
        pass: false
      };
    }
  },
  
  toBeKeyboardNavigable: async (received: HTMLElement, user: any) => {
    const result = await AccessibilityTestUtils.testKeyboardNavigation(user, received);
    const pass = result.issues.length === 0;
    
    if (pass) {
      return {
        message: () => `Expected element to have keyboard navigation issues, but none were found`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected element to be keyboard navigable, but found issues:\n${result.issues.join('\n')}`,
        pass: false
      };
    }
  }
};

// Export default configuration
export default {
  axeConfig,
  AccessibilityTestUtils,
  accessibilityMatchers
};
