import { Component } from "preact";
import type { ComponentChildren } from "preact";
import { clearGameState } from "@/lib/storage";
import "./ErrorBoundary.css";

type Props = { children: ComponentChildren };
type State = { failed: boolean };

/**
 * Last line of defence around the board.
 *
 * The realistic crash here is a saved game that throws while being restored:
 * without a boundary that is a white screen, and reloading replays the same
 * throw forever. So the important control is not "try again" but "start over",
 * which clears the stored state before reloading. It calls `clearGameState`
 * directly rather than through anything in the crashed tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // No reporting endpoint (connect-src is 'self'), so the console is the only
    // place this can go. Keep it — it is what a bug report will be built from.
    console.error("Taksonomi krasjet:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="crash" role="alert">
        <h1 className="crash__title">Noe gikk galt</h1>
        <p className="crash__body">
          Spillet klarte ikke å tegne brettet. Du kan prøve på nytt — hjelper ikke det, er det
          sannsynligvis det lagrede spillet som er ødelagt, og da må det nullstilles.
        </p>
        <div className="crash__actions">
          <button
            type="button"
            className="crash__button"
            onClick={() => this.setState({ failed: false })}
          >
            Prøv igjen
          </button>
          <button
            type="button"
            className="crash__button crash__button--primary"
            onClick={() => {
              clearGameState();
              location.reload();
            }}
          >
            Start på nytt
          </button>
        </div>
      </div>
    );
  }
}
