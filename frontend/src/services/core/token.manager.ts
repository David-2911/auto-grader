import { store } from '@/store';
import { logout, setToken } from '@/store/slices/authSlice';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  private static readonly TOKEN_TYPE_KEY = 'token_type';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.initializeTokenFromStorage();
  }

  private initializeTokenFromStorage(): void {
    const accessToken = this.getStoredAccessToken();
    const refreshToken = this.getStoredRefreshToken();
    const expiresAt = this.getStoredTokenExpiry();

    if (accessToken && refreshToken && expiresAt) {
      // Check if token is still valid
      if (this.isTokenValid(expiresAt)) {
        store.dispatch(setToken({
          accessToken,
          refreshToken,
          expiresAt,
          tokenType: this.getStoredTokenType() || 'Bearer',
        }));
      } else {
        // Token expired, try to refresh
        this.refreshToken().catch(() => {
          this.clearTokens();
        });
      }
    }
  }

  public async getValidToken(): Promise<string | null> {
    const state = store.getState();
    const currentToken = state.auth.token;

    if (!currentToken) {
      return null;
    }

    // Parse token data
    const tokenData = this.parseTokenData(currentToken);
    if (!tokenData) {
      return null;
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken(tokenData.expiresAt)) {
      return this.refreshToken();
    }

    return tokenData.accessToken;
  }

  public async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      this.refreshPromise = null;
      return result;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Refresh token is invalid or expired
          this.clearTokens();
          store.dispatch(logout());
          throw new Error('Refresh token expired');
        }
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const tokenData: TokenData = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken || refreshToken,
          expiresAt: Date.now() + (data.data.expiresIn * 1000),
          tokenType: data.data.tokenType || 'Bearer',
        };

        this.storeTokenData(tokenData);
        store.dispatch(setToken(tokenData));

        return tokenData.accessToken;
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      this.clearTokens();
      store.dispatch(logout());
      throw error;
    }
  }

  public storeTokenData(tokenData: TokenData): void {
    localStorage.setItem(TokenManager.ACCESS_TOKEN_KEY, tokenData.accessToken);
    localStorage.setItem(TokenManager.REFRESH_TOKEN_KEY, tokenData.refreshToken);
    localStorage.setItem(TokenManager.TOKEN_EXPIRY_KEY, tokenData.expiresAt.toString());
    localStorage.setItem(TokenManager.TOKEN_TYPE_KEY, tokenData.tokenType);

    // Also store in secure storage if available
    this.storeInSecureStorage(tokenData);
  }

  public clearTokens(): void {
    localStorage.removeItem(TokenManager.ACCESS_TOKEN_KEY);
    localStorage.removeItem(TokenManager.REFRESH_TOKEN_KEY);
    localStorage.removeItem(TokenManager.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(TokenManager.TOKEN_TYPE_KEY);

    // Clear from secure storage
    this.clearFromSecureStorage();
  }

  private getStoredAccessToken(): string | null {
    return localStorage.getItem(TokenManager.ACCESS_TOKEN_KEY);
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(TokenManager.REFRESH_TOKEN_KEY);
  }

  private getStoredTokenExpiry(): number | null {
    const expiry = localStorage.getItem(TokenManager.TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  }

  private getStoredTokenType(): string | null {
    return localStorage.getItem(TokenManager.TOKEN_TYPE_KEY);
  }

  private parseTokenData(token: string | TokenData): TokenData | null {
    if (typeof token === 'object') {
      return token;
    }

    // If token is a string, try to decode JWT to get expiry
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + (60 * 60 * 1000); // Default 1 hour

      return {
        accessToken: token,
        refreshToken: this.getStoredRefreshToken() || '',
        expiresAt,
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  private isTokenValid(expiresAt: number): boolean {
    return Date.now() < expiresAt;
  }

  private shouldRefreshToken(expiresAt: number): boolean {
    const timeUntilExpiry = expiresAt - Date.now();
    return timeUntilExpiry <= TokenManager.REFRESH_THRESHOLD;
  }

  private async storeInSecureStorage(tokenData: TokenData): Promise<void> {
    // Use Web Crypto API for secure storage if available
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        // This is a simplified example - in production, you'd want more robust encryption
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(tokenData));
        
        // Store in IndexedDB or other secure storage
        // Implementation depends on your security requirements
      } catch (error) {
        console.warn('Failed to store tokens securely:', error);
      }
    }
  }

  private async clearFromSecureStorage(): Promise<void> {
    // Clear from secure storage implementation
  }

  // Utility methods for token inspection
  public getTokenInfo(): TokenData | null {
    const state = store.getState();
    const token = state.auth.token;
    
    if (!token) {
      return null;
    }

    return this.parseTokenData(token);
  }

  public getTimeUntilExpiry(): number | null {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return null;
    }

    return tokenInfo.expiresAt - Date.now();
  }

  public isTokenExpired(): boolean {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return true;
    }

    return !this.isTokenValid(tokenInfo.expiresAt);
  }

  public willTokenExpireSoon(): boolean {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return true;
    }

    return this.shouldRefreshToken(tokenInfo.expiresAt);
  }

  // Event handlers for token state changes
  public onTokenRefresh(callback: (tokenData: TokenData) => void): () => void {
    // Implementation for token refresh event subscription
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const token = state.auth.token;
      
      if (token) {
        const tokenData = this.parseTokenData(token);
        if (tokenData) {
          callback(tokenData);
        }
      }
    });

    return unsubscribe;
  }

  public onTokenExpired(callback: () => void): () => void {
    // Implementation for token expiration event subscription
    const checkExpiry = () => {
      if (this.isTokenExpired()) {
        callback();
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }
}

export default TokenManager;
