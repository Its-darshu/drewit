import { useAuth } from '../hooks/useAuth';

export const LoginPage = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center px-6">
        <div className="glass-panel px-8 py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
          <p className="mt-4 text-sm brand-muted">Preparing your canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen py-8 px-4 sm:px-8 flex items-center justify-center">
      <div className="glass-panel overflow-hidden max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2">
        <section className="p-8 sm:p-12 bg-gradient-to-br from-orange-50 via-rose-50 to-amber-100 relative">
          <div className="absolute top-0 right-0 w-44 h-44 bg-orange-200/30 rounded-full blur-2xl" aria-hidden="true" />
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-amber-700">DrewIt Studio</p>
          <h1 className="brand-title mt-4 text-4xl sm:text-5xl font-bold leading-tight">
            Sketch fast.
            <br />
            Present beautifully.
          </h1>
          <p className="mt-5 text-base sm:text-lg brand-muted leading-relaxed max-w-md">
            Plan ideas on an infinite canvas with expressive tools and polished exports designed for product teams.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
            <div className="rounded-xl bg-white/70 border border-amber-200 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-800">Modes</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">DrewIt + Excalidraw</p>
            </div>
            <div className="rounded-xl bg-white/70 border border-amber-200 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-800">Autosave</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">Local first workflow</p>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-12 bg-white/70">
          <div className="max-w-md mx-auto">
            <h2 className="brand-title text-3xl font-bold">Welcome back</h2>
            <p className="mt-2 text-sm brand-muted">Sign in with Google to access your projects and continue where you left off.</p>

            <button
              onClick={handleGoogleSignIn}
              className="group mt-8 relative w-full flex justify-center items-center py-3.5 px-4 text-sm rounded-xl transition-all duration-200 brand-button"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="mt-6 text-xs brand-muted leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
