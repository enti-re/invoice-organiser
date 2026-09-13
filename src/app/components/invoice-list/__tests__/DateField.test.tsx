// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatIsoDate } from "@/lib/date";
import { DateField } from "../DateField";

// This project doesn't run RTL's auto-cleanup (no global afterEach hook
// configured in vitest.config.ts), so each render() would otherwise pile
// up in the document across tests in this file.
afterEach(cleanup);

const today = () => formatIsoDate(new Date());
// The trigger button's accessible name is its aria-label, which combines
// the field label with the current (or placeholder) value -- not just the
// bare date text -- so a screen reader announces "Start date: 2026-03-15",
// not just "2026-03-15" out of context.
const triggerName = (value: string) => `Start date: ${value || `${today()} (not set)`}`;

describe("DateField", () => {
  it("shows today's date, dimmed, as a placeholder when value is empty", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: triggerName("") });
    expect(button.className).toContain("text-neutral-400");
    expect(button.textContent).toBe(today());
  });

  it("shows the real value, not dimmed, once a date is set", () => {
    render(<DateField label="Start date" value="2026-03-15" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: triggerName("2026-03-15") });
    expect(button.className).toContain("text-neutral-100");
  });

  it("opens the calendar on click", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("grid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: triggerName("") }));
    expect(screen.queryByRole("grid")).not.toBeNull();
  });

  it("marks the trigger as a collapsed popup, then expanded once opened", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: triggerName("") });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("selecting a day calls onChange with that day's ISO date and closes the calendar", () => {
    // The calendar always opens on the current month regardless of `value`
    // (there's no defaultMonth wired to the selected date), so click
    // "today" rather than assuming a specific day is visible.
    const onChange = vi.fn();
    render(<DateField label="Start date" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: triggerName("") }));
    fireEvent.click(screen.getByRole("button", { name: /^today,/i }));

    expect(onChange).toHaveBeenCalledWith(today());
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("clicking outside closes the calendar without calling onChange", () => {
    const onChange = vi.fn();
    render(
      <div>
        <DateField label="Start date" value="" onChange={onChange} />
        <button type="button">outside</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: triggerName("") }));
    expect(screen.queryByRole("grid")).not.toBeNull();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Escape closes the calendar without calling onChange", () => {
    const onChange = vi.fn();
    render(<DateField label="Start date" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: triggerName("") }));
    expect(screen.queryByRole("grid")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("restores focus to the trigger button after closing via Escape", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: triggerName("") });
    // fireEvent.click doesn't simulate a real browser's focus-follows-click
    // behavior, unlike an actual mouse/keyboard activation -- focus the
    // button explicitly so useFocusTrap has a real "previously focused"
    // element to capture and restore.
    button.focus();
    fireEvent.click(button);
    expect(screen.queryByRole("grid")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(button);
  });
});
