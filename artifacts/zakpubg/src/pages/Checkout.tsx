// Redirected to GamePage — this file now just re-exports or redirects
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Checkout() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/"); }, [navigate]);
  return null;
}
