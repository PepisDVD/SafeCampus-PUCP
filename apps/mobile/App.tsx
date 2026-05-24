import { AuthProvider } from "./src/features/auth/auth-context";
import { OperatorApp } from "./src/bootstrap/OperatorApp";

export default function App() {
  return (
    <AuthProvider>
      <OperatorApp />
    </AuthProvider>
  );
}
