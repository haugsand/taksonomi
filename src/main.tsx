import { render } from "preact";
import { Game } from "@/components/game/Game";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

render(<Game />, root);
