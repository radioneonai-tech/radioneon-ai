/**
 * Radio Neon - Authentication & User Profile Module
 * Google / Gmail Sign-In & Email/Password Authentication
 */

const Auth = {
  currentUser: null,
  isLoginMode: true,

  init() {
    this.bindEvents();
    this.checkSession();
  },

  bindEvents() {
    // Open Auth Modal
    const btnAuthOpen = document.getElementById('btnAuthOpen');
    if (btnAuthOpen) {
      btnAuthOpen.addEventListener('click', () => this.openModal());
    }

    const btnCloseAuth = document.getElementById('btnCloseAuth');
    if (btnCloseAuth) {
      btnCloseAuth.addEventListener('click', () => this.closeModal());
    }

    // Switch between Login and Register tabs
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const groupName = document.getElementById('groupName');
    const btnSubmit = document.getElementById('btnAuthSubmit');

    if (tabLogin) {
      tabLogin.addEventListener('click', () => {
        this.isLoginMode = true;
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        if (groupName) groupName.style.display = 'none';
        if (btnSubmit) btnSubmit.textContent = UI.getTranslation('login');
      });
    }

    if (tabRegister) {
      tabRegister.addEventListener('click', () => {
        this.isLoginMode = false;
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        if (groupName) groupName.style.display = 'flex';
        if (btnSubmit) btnSubmit.textContent = UI.getTranslation('register');
      });
    }

    // Google Sign-In Button
    const btnGoogle = document.getElementById('btnGoogleLogin');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', () => this.handleGoogleLogin());
    }

    // Form Submit
    const form = document.getElementById('authForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Logout Button
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }
  },

  async checkSession() {
    const savedUser = localStorage.getItem('radio_neon_user');
    const savedToken = localStorage.getItem('radio_neon_token');

    if (savedUser && savedToken) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.updateNavUI();
      } catch (e) {
        this.logout();
      }
    }
  },

  getUser() {
    return this.currentUser;
  },

  openModal() {
    const overlay = document.getElementById('authModalOverlay');
    const form = document.getElementById('authForm');
    const userProfileView = document.getElementById('userProfileView');
    const googleBox = document.querySelector('.google-auth-box');
    const authDivider = document.querySelector('.auth-divider');
    const authTabs = document.querySelector('.auth-tabs');

    if (this.currentUser) {
      // Show profile card
      if (form) form.style.display = 'none';
      if (googleBox) googleBox.style.display = 'none';
      if (authDivider) authDivider.style.display = 'none';
      if (authTabs) authTabs.style.display = 'none';
      if (userProfileView) userProfileView.style.display = 'block';

      this.renderProfileDetails();
    } else {
      // Show login/register form
      if (form) form.style.display = 'flex';
      if (googleBox) googleBox.style.display = 'block';
      if (authDivider) authDivider.style.display = 'block';
      if (authTabs) authTabs.style.display = 'flex';
      if (userProfileView) userProfileView.style.display = 'none';
    }

    if (overlay) overlay.classList.add('open');
  },

  closeModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) overlay.classList.remove('open');
    this.hideError();
  },

  renderProfileDetails() {
    if (!this.currentUser) return;

    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileLikesCount = document.getElementById('profileLikesCount');
    const profilePlaylistsCount = document.getElementById('profilePlaylistsCount');

    if (profileName) profileName.textContent = this.currentUser.name;
    if (profileEmail) profileEmail.textContent = this.currentUser.email;
    if (profileAvatar) profileAvatar.src = this.currentUser.avatar || 'assets/PNG-LOGO.png';

    const likedCount = AppState.tracks ? AppState.tracks.filter(t => t.isLiked).length : 0;
    if (profileLikesCount) profileLikesCount.textContent = likedCount;
    if (profilePlaylistsCount) profilePlaylistsCount.textContent = Playlists.playlists.length;
  },

  async handleSubmit() {
    const emailInput = document.getElementById('authEmailInput');
    const passwordInput = document.getElementById('authPasswordInput');
    const nameInput = document.getElementById('authNameInput');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!email || !password) {
      this.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      let data;
      if (this.isLoginMode) {
        data = await API.login(email, password);
      } else {
        data = await API.register(email, password, name);
      }

      if (data && data.token && data.user) {
        this.saveSession(data.token, data.user);
        this.closeModal();
        UI.showToast(`مرحباً بك، ${data.user.name}! 🎧`);
        Playlists.loadPlaylists();
      }
    } catch (err) {
      this.showError(err.message || 'فشلت المصادقة');
    }
  },

  // Google One-Tap / OAuth Sign-in Handler
  async handleGoogleLogin() {
    // Generate/retrieve simulated Google account or OAuth response
    const mockGoogleUser = {
      email: 'neon.listener@gmail.com',
      name: 'Google User (Neon)',
      avatar: 'assets/PNG-LOGO.png',
      googleId: 'google_' + Date.now()
    };

    try {
      const data = await API.googleAuth(mockGoogleUser);
      if (data && data.token && data.user) {
        this.saveSession(data.token, data.user);
        this.closeModal();
        UI.showToast(`تم تسجيل الدخول عبر Google بنجاح! 🚀`);
        Playlists.loadPlaylists();
      }
    } catch (err) {
      this.showError('تعذر تسجيل الدخول عبر Google');
    }
  },

  saveSession(token, user) {
    this.currentUser = user;
    localStorage.setItem('radio_neon_token', token);
    localStorage.setItem('radio_neon_user', JSON.stringify(user));
    this.updateNavUI();
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('radio_neon_token');
    localStorage.removeItem('radio_neon_user');
    this.updateNavUI();
    this.closeModal();
    UI.showToast('تم تسجيل الخروج بنجاح');
  },

  updateNavUI() {
    const authBtnText = document.getElementById('authBtnText');
    const authWrapper = document.getElementById('authWrapper');

    if (!authBtnText || !authWrapper) return;

    if (this.currentUser) {
      authWrapper.innerHTML = `
        <button class="auth-btn" id="btnAuthOpen">
          <img src="${this.currentUser.avatar || 'assets/PNG-LOGO.png'}" alt="Avatar" class="user-avatar-nav">
          <span>${UI.escapeHtml(this.currentUser.name)}</span>
        </button>
      `;
      document.getElementById('btnAuthOpen').addEventListener('click', () => this.openModal());
    } else {
      authWrapper.innerHTML = `
        <button class="auth-btn" id="btnAuthOpen">
          <i class="fa-solid fa-user-circle"></i>
          <span id="authBtnText">${UI.getTranslation('login')}</span>
        </button>
      `;
      document.getElementById('btnAuthOpen').addEventListener('click', () => this.openModal());
    }
  },

  showError(msg) {
    const el = document.getElementById('authErrorMsg');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  },

  hideError() {
    const el = document.getElementById('authErrorMsg');
    if (el) el.style.display = 'none';
  }
};
