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

describe("DateField", () => {
  it("shows today's date, dimmed, as a placeholder when value is empty", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: today() });
    expect(button.className).toContain("text-neutral-500");
  });

  it("shows the real value, not dimmed, once a date is set", () => {
    render(<DateField label="Start date" value="2026-03-15" onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: "2026-03-15" });
    expect(button.className).toContain("text-neutral-100");
  });

  it("opens the calendar on click", () => {
    render(<DateField label="Start date" value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("grid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: today() }));
    expect(screen.queryByRole("grid")).not.toBeNull();
  });

  it("selecting a day calls onChange with that day's ISO date and closes the calendar", () => {
    // The calendar always opens on the current month regardless of `value`
    // (there's no defaultMonth wired to the selected date), so click
    // "today" rather than assuming a specific day is visible.
    const onChange = vi.fn();
    render(<DateField label="Start date" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: today() }));
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

    fireEvent.click(screen.getByRole("button", { name: today() }));
    expect(screen.queryByRole("grid")).not.toBeNull();

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Escape closes the calendar without calling onChange", () => {
    const onChange = vi.fn();
    render(<DateField label="Start date" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: today() }));
    expect(screen.queryByRole("grid")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
