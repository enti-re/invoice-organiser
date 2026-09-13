// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { FilterBar } from "../FilterBar";
import { useInvoiceList } from "../useInvoiceList";

afterEach(cleanup);

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

// Exercises FilterBar against the real hook (mocked fetch only) rather than
// a hand-built fake controller, so the test can't silently drift from the
// real InvoiceListController shape.
const Harness = () => {
  const list = useInvoiceList();
  return <FilterBar list={list} />;
};

describe("FilterBar", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toggling Filters opens and closes the panel", async () => {
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.queryByText("Min total")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("Min total")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.queryByText("Min total")).toBeNull();
  });

  it("Apply is disabled with no filters set and enabled once one is", async () => {
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const apply = screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Min total"), { target: { value: "500" } });
    expect(apply.disabled).toBe(false);
  });

  it("shows an inline error and disables Apply when min is greater than max", async () => {
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    fireEvent.change(screen.getByLabelText("Min total"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Max total"), { target: { value: "100" } });

    expect(screen.getByText("Min total can't be greater than max total.")).not.toBeNull();
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Clear is disabled with no advanced filters set and enabled once one is", async () => {
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const clear = screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement;
    expect(clear.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Min total"), { target: { value: "500" } });
    expect(clear.disabled).toBe(false);
  });
});
