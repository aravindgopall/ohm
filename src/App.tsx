import PastePicker from "./picker/PastePicker";

export default function App() {
  const path = window.location.pathname;
  if (path === "/picker") return <PastePicker />;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2>MyClipboard</h2>
      <p>Press Ctrl+Shift+V to open the paste picker.</p>
    </div>
  );
}
