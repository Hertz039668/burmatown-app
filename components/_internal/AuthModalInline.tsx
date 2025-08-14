import AuthModal from "../AuthModal";

export default function AuthModalInline(props: any) {
  return <AuthModal {...props} />;
}
// This file is a simple wrapper for the AuthModal component to be used inline.
// It allows for easier integration in components without needing to import the full AuthModal file.