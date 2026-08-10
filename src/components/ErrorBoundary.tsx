import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-rose-500/40 bg-slate-900 p-8 shadow-2xl text-center">
            <h2 className="text-xl font-bold text-rose-300">Beklenmeyen Hata</h2>
            <p className="mt-3 text-sm text-slate-300">
              Uygulamada beklenmeyen bir hata oluştu. Sayfayı yenileyerek tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent/90"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
