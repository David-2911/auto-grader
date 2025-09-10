/**
 * Authentication Page Object Model
 * Handles all authentication-related UI interactions
 */

import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  
  // Login page elements
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly loginErrorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  
  // Registration page elements
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerFirstNameInput: Locator;
  readonly registerLastNameInput: Locator;
  readonly registerIdentifierInput: Locator;
  readonly registerRoleSelect: Locator;
  readonly registerSubmitButton: Locator;
  readonly registerErrorMessage: Locator;
  
  // Password reset elements
  readonly resetEmailInput: Locator;
  readonly resetSubmitButton: Locator;
  readonly resetSuccessMessage: Locator;
  
  // Common elements
  readonly logoutButton: Locator;
  readonly userMenuButton: Locator;
  readonly userProfileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Login elements
    this.loginEmailInput = page.locator('[data-testid="login-email"]');
    this.loginPasswordInput = page.locator('[data-testid="login-password"]');
    this.loginSubmitButton = page.locator('[data-testid="login-submit"]');
    this.loginErrorMessage = page.locator('[data-testid="login-error"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    
    // Registration elements
    this.registerEmailInput = page.locator('[data-testid="register-email"]');
    this.registerPasswordInput = page.locator('[data-testid="register-password"]');
    this.registerConfirmPasswordInput = page.locator('[data-testid="register-confirm-password"]');
    this.registerFirstNameInput = page.locator('[data-testid="register-first-name"]');
    this.registerLastNameInput = page.locator('[data-testid="register-last-name"]');
    this.registerIdentifierInput = page.locator('[data-testid="register-identifier"]');
    this.registerRoleSelect = page.locator('[data-testid="register-role"]');
    this.registerSubmitButton = page.locator('[data-testid="register-submit"]');
    this.registerErrorMessage = page.locator('[data-testid="register-error"]');
    
    // Password reset elements
    this.resetEmailInput = page.locator('[data-testid="reset-email"]');
    this.resetSubmitButton = page.locator('[data-testid="reset-submit"]');
    this.resetSuccessMessage = page.locator('[data-testid="reset-success"]');
    
    // Common elements
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.userMenuButton = page.locator('[data-testid="user-menu"]');
    this.userProfileLink = page.locator('[data-testid="user-profile-link"]');
  }

  // Navigation methods
  async navigateToLogin() {
    await this.page.goto('/login');
    await expect(this.loginEmailInput).toBeVisible();
  }

  async navigateToRegister() {
    await this.page.goto('/register');
    await expect(this.registerEmailInput).toBeVisible();
  }

  async navigateToPasswordReset() {
    await this.page.goto('/password-reset');
    await expect(this.resetEmailInput).toBeVisible();
  }

  // Login methods
  async login(email: string, password: string) {
    await this.navigateToLogin();
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginSubmitButton.click();
  }

  async loginAsStudent(email = 'student@test.com', password = 'TestPassword123!') {
    await this.login(email, password);
    // Wait for redirect to student dashboard
    await this.page.waitForURL('/student/dashboard');
  }

  async loginAsTeacher(email = 'teacher@test.com', password = 'TestPassword123!') {
    await this.login(email, password);
    // Wait for redirect to teacher dashboard
    await this.page.waitForURL('/teacher/dashboard');
  }

  async loginAsAdmin(email = 'admin@test.com', password = 'TestPassword123!') {
    await this.login(email, password);
    // Wait for redirect to admin dashboard
    await this.page.waitForURL('/admin/dashboard');
  }

  async expectLoginSuccess() {
    // Should redirect away from login page
    await expect(this.page).not.toHaveURL('/login');
    
    // Should show user menu
    await expect(this.userMenuButton).toBeVisible();
  }

  async expectLoginError(errorMessage?: string) {
    await expect(this.loginErrorMessage).toBeVisible();
    
    if (errorMessage) {
      await expect(this.loginErrorMessage).toContainText(errorMessage);
    }
    
    // Should still be on login page
    await expect(this.page).toHaveURL('/login');
  }

  // Registration methods
  async registerStudent(userData: {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    identifier: string;
  }) {
    await this.navigateToRegister();
    
    await this.registerEmailInput.fill(userData.email);
    await this.registerPasswordInput.fill(userData.password);
    await this.registerConfirmPasswordInput.fill(userData.confirmPassword);
    await this.registerFirstNameInput.fill(userData.firstName);
    await this.registerLastNameInput.fill(userData.lastName);
    await this.registerIdentifierInput.fill(userData.identifier);
    await this.registerRoleSelect.selectOption('student');
    
    await this.registerSubmitButton.click();
  }

  async expectRegistrationSuccess() {
    // Should redirect to dashboard after successful registration
    await this.page.waitForURL(/\/(student|teacher|admin)\/dashboard/);
    await expect(this.userMenuButton).toBeVisible();
  }

  async expectRegistrationError(errorMessage?: string) {
    await expect(this.registerErrorMessage).toBeVisible();
    
    if (errorMessage) {
      await expect(this.registerErrorMessage).toContainText(errorMessage);
    }
    
    // Should still be on registration page
    await expect(this.page).toHaveURL('/register');
  }

  // Password reset methods
  async initiatePasswordReset(email: string) {
    await this.navigateToPasswordReset();
    await this.resetEmailInput.fill(email);
    await this.resetSubmitButton.click();
  }

  async expectPasswordResetSuccess() {
    await expect(this.resetSuccessMessage).toBeVisible();
    await expect(this.resetSuccessMessage).toContainText('reset instructions');
  }

  // Logout methods
  async logout() {
    await this.userMenuButton.click();
    await this.logoutButton.click();
    
    // Wait for redirect to login page
    await this.page.waitForURL('/login');
  }

  async expectLogoutSuccess() {
    await expect(this.page).toHaveURL('/login');
    await expect(this.userMenuButton).not.toBeVisible();
  }

  // Validation methods
  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL('/login');
    await expect(this.loginEmailInput).toBeVisible();
    await expect(this.loginPasswordInput).toBeVisible();
    await expect(this.loginSubmitButton).toBeVisible();
  }

  async expectToBeOnRegisterPage() {
    await expect(this.page).toHaveURL('/register');
    await expect(this.registerEmailInput).toBeVisible();
    await expect(this.registerPasswordInput).toBeVisible();
    await expect(this.registerSubmitButton).toBeVisible();
  }

  async expectToBeAuthenticated() {
    // User menu should be visible when authenticated
    await expect(this.userMenuButton).toBeVisible();
    
    // Should not be on login or register pages
    await expect(this.page).not.toHaveURL('/login');
    await expect(this.page).not.toHaveURL('/register');
  }

  async expectToBeUnauthenticated() {
    // Should be redirected to login page
    await expect(this.page).toHaveURL('/login');
    
    // User menu should not be visible
    await expect(this.userMenuButton).not.toBeVisible();
  }

  // Form validation methods
  async expectEmailValidationError() {
    const emailError = this.page.locator('[data-testid="email-error"]');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('email');
  }

  async expectPasswordValidationError() {
    const passwordError = this.page.locator('[data-testid="password-error"]');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText('password');
  }

  async expectRequiredFieldErrors() {
    const requiredErrors = this.page.locator('[data-testid*="error"]');
    await expect(requiredErrors.first()).toBeVisible();
  }

  // Accessibility methods
  async checkLoginPageAccessibility() {
    await this.navigateToLogin();
    
    // Check for proper labels
    await expect(this.loginEmailInput).toHaveAttribute('aria-label');
    await expect(this.loginPasswordInput).toHaveAttribute('aria-label');
    
    // Check for proper headings
    const heading = this.page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Check for keyboard navigation
    await this.page.keyboard.press('Tab');
    await expect(this.loginEmailInput).toBeFocused();
  }

  // Utility methods
  async clearLoginForm() {
    await this.loginEmailInput.clear();
    await this.loginPasswordInput.clear();
  }

  async clearRegistrationForm() {
    await this.registerEmailInput.clear();
    await this.registerPasswordInput.clear();
    await this.registerConfirmPasswordInput.clear();
    await this.registerFirstNameInput.clear();
    await this.registerLastNameInput.clear();
    await this.registerIdentifierInput.clear();
  }

  async getCurrentUserRole(): Promise<string | null> {
    // Extract role from current URL or user menu
    const url = this.page.url();
    
    if (url.includes('/student/')) return 'student';
    if (url.includes('/teacher/')) return 'teacher';
    if (url.includes('/admin/')) return 'admin';
    
    return null;
  }

  async saveAuthenticationState(path: string) {
    // Save current authentication state for reuse in other tests
    await this.page.context().storageState({ path });
  }
}
