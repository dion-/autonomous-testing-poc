import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Payment } from "./Payment";

describe("Payment", () => {
  it("renders inputs and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <Payment
        data={{ cardNumber: "", expiry: "", cvv: "" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Card Number"), { target: { value: "1234567890123456" } });
    expect(onChange).toHaveBeenLastCalledWith("cardNumber", "1234567890123456");

    fireEvent.change(screen.getByLabelText("Expiry (MM/YY)"), { target: { value: "12/25" } });
    expect(onChange).toHaveBeenLastCalledWith("expiry", "12/25");

    fireEvent.change(screen.getByLabelText("CVV"), { target: { value: "123" } });
    expect(onChange).toHaveBeenLastCalledWith("cvv", "123");
  });

  it("validates card number", () => {
    const onChange = vi.fn();
    render(
      <Payment
        data={{ cardNumber: "1234", expiry: "", cvv: "" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Card Number")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/please enter a valid card number/i)).toBeInTheDocument();
  });

  it("validates expiry", () => {
    const onChange = vi.fn();
    render(
      <Payment
        data={{ cardNumber: "", expiry: "bad", cvv: "" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Expiry (MM/YY)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/please enter a valid expiry/i)).toBeInTheDocument();
  });

  it("validates cvv", () => {
    const onChange = vi.fn();
    render(
      <Payment
        data={{ cardNumber: "", expiry: "", cvv: "12" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("CVV")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/please enter a valid cvv/i)).toBeInTheDocument();
  });

  it("does not show error messages for empty fields", () => {
    render(
      <Payment
        data={{ cardNumber: "", expiry: "", cvv: "" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/please enter a valid/i)).not.toBeInTheDocument();
  });
});
