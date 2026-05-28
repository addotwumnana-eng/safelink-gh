import { ExpoRoot } from "expo-router";

declare const require: {
  context: (path: string) => Parameters<typeof ExpoRoot>[0]["context"];
};

const ctx = require.context("./app");

export default function App() {
  return <ExpoRoot context={ctx} />;
}
