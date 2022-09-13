# Cleff - simple useEffect for class React components

Cleff makes it possible to write declarative effects in class React components:

```jsx
import { classEffect, withEffects } from 'cleff';

class KeyCounterImpl extends React.Component {
  state = { count: 0 };

  render() {
    classEffect(() => {
      const listener = (ev) => {
        if (ev.key === this.props.letter) {
          this.setState((state) => ({ count: state.count + 1 }));
        }
      };

      window.addEventListener("keydown", listener);

      return () => {
        window.removeEventListener("keydown", listener);
      };
    }, [this.props.letter]);

    return (
      <h1>
        Key {this.props.letter} pressed {this.state.count} times
      </h1>
    );
  }
}

const KeyCounter = withEffects(KeyCounterImpl);

<KeyCounter letter="a" />
```

Unlike React's `useEffect`, in Cleff effect dependencies can be a function returning an array, which is evaluated during component lifecycle methods.
Effects can be defined in `render()` method or component constructor, and constructor effects (intuitively) can only use the function dependencies:

```jsx
class KeyCounterImpl extends React.Component {
  constructor(props) {
    super(props);

    this.state = { count: 0 };

    classEffect(() => {
      const listener = (ev) => {
        if (ev.key === this.props.letter) {
          this.setState((state) => ({ count: state.count + 1 }));
        }
      };

      window.addEventListener("keydown", listener);

      return () => {
        window.removeEventListener("keydown", listener);
      };
    }, () => [this.props.letter]);
  }

  render() {
    return (
      <h1>
        Key {this.props.letter} pressed {this.state.count} times
      </h1>
    );
  }
}
```

# License

MIT

# Author

Eugene Daragan
