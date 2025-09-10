# Accessibility Testing Framework

## Overview

This accessibility testing framework ensures that the Auto-Grader system complies with WCAG 2.1 AA standards and provides an inclusive experience for all users, including those with disabilities.

## Testing Strategy

### 1. Automated Accessibility Testing

#### Tools Used
- **jest-axe**: Automated accessibility testing using axe-core
- **@testing-library/react**: Component testing with accessibility focus
- **@testing-library/user-event**: User interaction testing

#### Coverage Areas
- ARIA attributes and roles
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- Form accessibility
- Focus management
- Semantic HTML structure

### 2. Manual Testing Guidelines

#### Screen Reader Testing
- **NVDA** (Windows): Primary screen reader for testing
- **JAWS** (Windows): Secondary screen reader testing
- **VoiceOver** (macOS): macOS accessibility testing
- **Orca** (Linux): Linux accessibility testing

#### Keyboard Navigation Testing
- Tab order verification
- Focus indicator visibility
- Keyboard shortcuts functionality
- Modal focus trapping
- Skip link functionality

#### Visual Testing
- High contrast mode compatibility
- Color blindness simulation
- Zoom testing (up to 200%)
- Text scaling compatibility
- Dark mode accessibility

## Test Structure

### Unit Tests
Located in: `frontend/src/test/accessibility/`

```typescript
// Example accessibility test
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component should be accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Integration Tests
Testing accessibility across component interactions and page flows.

### End-to-End Tests
Full user journey accessibility testing using Playwright with axe integration.

## WCAG 2.1 AA Compliance Checklist

### Level A Requirements

#### ✅ Perceivable
- [ ] **1.1.1 Non-text Content**: All images have alt text
- [ ] **1.2.1 Audio-only and Video-only**: Alternatives provided
- [ ] **1.2.2 Captions**: Live captions for video content
- [ ] **1.2.3 Audio Description**: Audio descriptions for video
- [ ] **1.3.1 Info and Relationships**: Proper heading structure, labels
- [ ] **1.3.2 Meaningful Sequence**: Logical reading order
- [ ] **1.3.3 Sensory Characteristics**: Don't rely solely on color/shape
- [ ] **1.4.1 Use of Color**: Color not sole means of information
- [ ] **1.4.2 Audio Control**: Audio can be paused/stopped

#### ✅ Operable
- [ ] **2.1.1 Keyboard**: All functionality via keyboard
- [ ] **2.1.2 No Keyboard Trap**: No keyboard focus traps
- [ ] **2.1.4 Character Key Shortcuts**: Shortcuts can be disabled
- [ ] **2.2.1 Timing Adjustable**: Time limits can be extended
- [ ] **2.2.2 Pause, Stop, Hide**: Moving content can be controlled
- [ ] **2.3.1 Three Flashes**: No content flashes > 3 times/second
- [ ] **2.4.1 Bypass Blocks**: Skip links provided
- [ ] **2.4.2 Page Titled**: Descriptive page titles
- [ ] **2.4.3 Focus Order**: Logical focus order
- [ ] **2.4.4 Link Purpose**: Clear link purposes

#### ✅ Understandable
- [ ] **3.1.1 Language of Page**: Page language identified
- [ ] **3.2.1 On Focus**: No context changes on focus
- [ ] **3.2.2 On Input**: No context changes on input
- [ ] **3.3.1 Error Identification**: Errors clearly identified
- [ ] **3.3.2 Labels or Instructions**: Clear form labels

#### ✅ Robust
- [ ] **4.1.1 Parsing**: Valid HTML markup
- [ ] **4.1.2 Name, Role, Value**: Proper ARIA implementation

### Level AA Requirements

#### ✅ Perceivable
- [ ] **1.2.4 Captions (Live)**: Live captions for audio
- [ ] **1.2.5 Audio Description**: Audio descriptions for video
- [ ] **1.4.3 Contrast (Minimum)**: 4.5:1 contrast ratio
- [ ] **1.4.4 Resize Text**: Text scalable to 200%
- [ ] **1.4.5 Images of Text**: Avoid text in images

#### ✅ Operable
- [ ] **2.4.5 Multiple Ways**: Multiple navigation methods
- [ ] **2.4.6 Headings and Labels**: Descriptive headings/labels
- [ ] **2.4.7 Focus Visible**: Visible focus indicators

#### ✅ Understandable
- [ ] **3.1.2 Language of Parts**: Language changes identified
- [ ] **3.2.3 Consistent Navigation**: Consistent navigation
- [ ] **3.2.4 Consistent Identification**: Consistent component identification
- [ ] **3.3.3 Error Suggestion**: Error correction suggestions
- [ ] **3.3.4 Error Prevention**: Error prevention for important data

## Educational Technology Specific Requirements

### Section 508 Compliance
- Electronic documents accessibility
- Software applications accessibility
- Web-based information accessibility
- Multimedia accessibility

### University Accessibility Standards
- Student information system accessibility
- Learning management system integration
- Academic content accessibility
- Assessment tool accessibility

## Running Accessibility Tests

### Development Environment

```bash
# Install dependencies
npm install --save-dev jest-axe @axe-core/react @testing-library/jest-dom

# Run accessibility tests
npm run test:accessibility

# Run accessibility tests with coverage
npm run test:accessibility:coverage

# Run accessibility tests in watch mode
npm run test:accessibility:watch
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Accessibility Tests
  run: |
    npm run test:accessibility
    npm run test:accessibility:report

- name: Upload Accessibility Report
  uses: actions/upload-artifact@v3
  with:
    name: accessibility-report
    path: coverage/accessibility/
```

### Test Scripts

```json
{
  "scripts": {
    "test:accessibility": "vitest run --config vitest.accessibility.config.ts",
    "test:accessibility:coverage": "vitest run --coverage --config vitest.accessibility.config.ts",
    "test:accessibility:watch": "vitest --config vitest.accessibility.config.ts",
    "test:accessibility:report": "vitest run --reporter=html --config vitest.accessibility.config.ts"
  }
}
```

## Testing Guidelines

### Component Testing
1. **Test every interactive component** for accessibility
2. **Verify ARIA attributes** are correctly implemented
3. **Test keyboard navigation** through all interactive elements
4. **Validate color contrast** meets WCAG standards
5. **Check focus management** for modal dialogs and dynamic content

### Page Testing
1. **Verify heading hierarchy** follows proper structure
2. **Test skip links** functionality
3. **Validate landmark regions** are properly defined
4. **Check page titles** are descriptive and unique
5. **Test form accessibility** with proper labels and error handling

### User Flow Testing
1. **Test complete user journeys** with keyboard only
2. **Verify screen reader announcements** for dynamic content
3. **Test error handling** accessibility
4. **Validate loading states** accessibility
5. **Check responsive design** accessibility

## Accessibility Issues Tracking

### Common Issues to Watch For

#### Form Accessibility
- Missing form labels
- Unclear error messages
- Inaccessible form validation
- Missing required field indicators

#### Navigation Issues
- Inconsistent navigation patterns
- Missing skip links
- Poor focus management
- Unclear link purposes

#### Content Issues
- Poor heading hierarchy
- Missing alt text for images
- Insufficient color contrast
- Text that's too small

#### Interactive Elements
- Missing ARIA labels
- Unclear button purposes
- Inaccessible modal dialogs
- Poor keyboard navigation

### Issue Severity Levels

#### Critical (Must Fix)
- WCAG 2.1 AA violations
- Complete keyboard inaccessibility
- Screen reader incompatibility
- Color contrast failures

#### High Priority
- Poor user experience for assistive technology users
- Missing ARIA attributes
- Focus management issues
- Confusing navigation

#### Medium Priority
- Enhancement opportunities
- Better semantic markup
- Improved screen reader experience
- Performance improvements

#### Low Priority
- Nice-to-have improvements
- Enhanced user experience
- Future accessibility features

## Resources and Training

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Resources](https://webaim.org/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Color Contrast Analyzers](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers
- [NVDA Download](https://www.nvaccess.org/download/)
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/)
- VoiceOver (built into macOS)

## Reporting and Monitoring

### Accessibility Dashboard
- Test coverage metrics
- Violation trends
- Compliance status
- Performance metrics

### Regular Audits
- Quarterly comprehensive accessibility audits
- Monthly automated testing reviews
- Weekly manual testing sessions
- Continuous monitoring with CI/CD

### Stakeholder Communication
- Regular accessibility status reports
- Training session scheduling
- Issue prioritization meetings
- Compliance certification tracking

## Getting Started

1. **Set up the testing environment**:
   ```bash
   cd frontend
   npm install
   npm run test:accessibility
   ```

2. **Review existing tests** in `src/test/accessibility/`

3. **Run accessibility audits** on new components

4. **Follow the testing guidelines** for comprehensive coverage

5. **Report issues** using the established severity levels

6. **Participate in regular training** and stay updated on accessibility best practices

This framework ensures that the Auto-Grader system provides an accessible and inclusive experience for all users while maintaining compliance with educational technology accessibility standards.
