import Layout from "./components/layout/Layout";
import { CursorProvider } from "./context/CursorContext";
import { useLenis } from "./hooks/useLenis";

/** Root application: initialise smooth scroll + provide global cursor state. */
export default function App() {
  useLenis();

  return (
    <CursorProvider>
      <Layout />
    </CursorProvider>
  );
}
