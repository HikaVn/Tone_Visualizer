import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: '1rem', color: '#e2e8f0', background: '#020617', minHeight: '100svh' }}>
          <h1>アプリの初期化でエラーが発生しました</h1>
          <p>ページを再読み込みしてください。解消しない場合は開発者コンソールを確認してください。</p>
          <pre>{this.state.message}</pre>
        </main>
      );
    }
    return this.props.children;
  }
}
