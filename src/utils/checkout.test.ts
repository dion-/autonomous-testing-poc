import { describe, expect, it } from "vitest";
import type { FormData } from "../hooks/useFormState";
import { clampStep, getCanProceed, getNextStep, getPrevStep, TOTAL_STEPS } from "./checkout";

const baseFormData: FormData = {
  personal: { firstName: "", lastName: "", email: "", phone: "" },
  shipping: { country: "", address: "", city: "", state: "", postalCode: "" },
  preferences: { newsletter: false, giftWrap: false, deliveryInstructions: "", promoCode: "" },
  payment: { cardNumber: "", expiry: "", cvv: "" },
};

const validPersonal: FormData = {
  ...baseFormData,
  personal: { firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "+1234567890" },
};

const validShipping: FormData = {
  ...baseFormData,
  shipping: { country: "US", address: "123 Main St", city: "SF", state: "CA", postalCode: "12345" },
};

const validPayment: FormData = {
  ...baseFormData,
  payment: { cardNumber: "1234567890123456", expiry: "12/25", cvv: "123" },
};

describe("TOTAL_STEPS", () => {
  it("is 5", () => {
    expect(TOTAL_STEPS).toBe(5);
  });
});

describe("getCanProceed", () => {
  it("returns false for step 0 with empty personal data", () => {
    expect(getCanProceed(0, baseFormData)).toBe(false);
  });

  it("returns true for step 0 with valid personal data", () => {
    expect(getCanProceed(0, validPersonal)).toBe(true);
  });

  it("returns false for step 1 with empty shipping data", () => {
    expect(getCanProceed(1, baseFormData)).toBe(false);
  });

  it("returns true for step 1 with valid shipping data", () => {
    expect(getCanProceed(1, validShipping)).toBe(true);
  });

  it("returns true for step 2 (preferences)", () => {
    expect(getCanProceed(2, baseFormData)).toBe(true);
  });

  it("returns false for step 3 with empty payment data", () => {
    expect(getCanProceed(3, baseFormData)).toBe(false);
  });

  it("returns true for step 3 with valid payment data", () => {
    expect(getCanProceed(3, validPayment)).toBe(true);
  });

  it("returns true for step 4 (review)", () => {
    expect(getCanProceed(4, baseFormData)).toBe(true);
  });

  it("returns false for out-of-range steps", () => {
    expect(getCanProceed(-1, baseFormData)).toBe(false);
    expect(getCanProceed(5, baseFormData)).toBe(false);
  });
});

describe("getNextStep", () => {
  it("increments step when below max", () => {
    expect(getNextStep(0)).toBe(1);
    expect(getNextStep(2)).toBe(3);
  });

  it("keeps step at max when already there", () => {
    expect(getNextStep(4)).toBe(4);
  });
});

describe("getPrevStep", () => {
  it("decrements step when above min", () => {
    expect(getPrevStep(1)).toBe(0);
    expect(getPrevStep(4)).toBe(3);
  });

  it("keeps step at min when already there", () => {
    expect(getPrevStep(0)).toBe(0);
  });
});

describe("clampStep", () => {
  it("returns target when in bounds", () => {
    expect(clampStep(0, 2)).toBe(0);
    expect(clampStep(4, 0)).toBe(4);
    expect(clampStep(2, 1)).toBe(2);
  });

  it("returns currentStep when target is out of bounds", () => {
    expect(clampStep(-1, 2)).toBe(2);
    expect(clampStep(5, 2)).toBe(2);
    expect(clampStep(99, 1)).toBe(1);
  });
});
