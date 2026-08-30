import { UserRole } from "@/types";

export function homeRouteForRole(role: UserRole): "/(patient)/home" | "/(doctor)/home" {
  return role === "DOCTOR" ? "/(doctor)/home" : "/(patient)/home";
}
