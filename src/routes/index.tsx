import { createFileRoute } from "@tanstack/react-router";
import { RedriotApp } from "@/components/redriot/app";

export const Route = createFileRoute("/")({ component: RedriotApp });
