// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SortIndicator, StatusBadge } from "../InvoiceListUI";

describe("StatusBadge", () => {
  it("renders 'Needs review' when flagged", () => {
    render(<StatusBadge needsReview={true} />);
    expect(screen.getByText("Needs review").textContent).toBe("Needs review");
  });

  it("renders 'Reviewed' when not flagged", () => {
    render(<StatusBadge needsReview={false} />);
    expect(screen.getByText("Reviewed").textContent).toBe("Reviewed");
  });
});

describe("SortIndicator", () => {
  it("renders an upward arrow for ascending", () => {
    render(<SortIndicator direction="asc" />);
    expect(screen.getByText("▲").textContent).toBe("▲");
  });

  it("renders a downward arrow for descending", () => {
    render(<SortIndicator direction="desc" />);
    expect(screen.getByText("▼").textContent).toBe("▼");
  });
});
