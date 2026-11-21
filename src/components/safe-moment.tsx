import { Component, type ComponentType, type ReactNode } from 'react';

/**
 * A celebration (the coin pour, the level-up, the letter) must never take the app down. Anything one of them throws
 * while rendering is caught here: the moment closes through `onFail` and the plain screen under it stays, as if it
 * had been dismissed. Reported in development only.
 */
export class SafeMoment extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn('[SafeMoment] a celebration failed and was closed', error);
    // After this render pass, so the parent's state change never lands mid-render.
    setTimeout(() => this.props.onFail(), 0);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** `Moment` wrapped in a SafeMoment that closes it through `close(props)` if it throws. */
export function safeMoment<P extends object>(Moment: ComponentType<P>, close: (props: P) => void): ComponentType<P> {
  function Safe(props: P) {
    return (
      <SafeMoment onFail={() => close(props)}>
        <Moment {...props} />
      </SafeMoment>
    );
  }
  Safe.displayName = `Safe(${Moment.displayName ?? Moment.name ?? 'Moment'})`;
  return Safe;
}
