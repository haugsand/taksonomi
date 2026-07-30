import { render } from "preact";
import { Game } from "@/components/Game";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

render(
  <ErrorBoundary>
    <Game />
  </ErrorBoundary>,
  root,
);
