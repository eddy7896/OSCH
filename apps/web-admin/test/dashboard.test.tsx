import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { getMessages } from "@oruschools/i18n";
import { Dashboard } from "@/components/Dashboard";

const show = (hour: number) => render(<NextIntlClientProvider locale="en" messages={getMessages("en")}><Dashboard name="Asha" role="TEACHER" hour={hour} /></NextIntlClientProvider>);

describe("Dashboard greeting", () => {
  it.each([[0, "Good morning, Asha"], [11, "Good morning, Asha"], [12, "Good afternoon, Asha"], [16, "Good afternoon, Asha"], [17, "Good evening, Asha"], [23, "Good evening, Asha"]])("at %i o'clock: %s", (hour, text) => {
    show(hour);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(text);
  });
  it("names the role in the person's language", () => {
    show(9);
    expect(screen.getByText("Your role: Teacher")).toBeTruthy();
  });
});
