import { describe, it, expect } from 'vitest';
import { studentRegistrationSchema, visitorSchema } from './schemas';

describe('Zod Schemas', () => {
  it('validates studentRegistrationSchema correctly', () => {
    const validData = {
      studentName: "John Doe", studentId: "ABCDE12345", dob: "2010-01-01", 
      applyingClass: "10th", fatherName: "Bob Doe", motherName: "Jane Doe",
      guardianName: "Bob Doe", guardianIncome: "500000", mobileNo: "9876543210",
      email: "test@test.com", category: "General",
      authorizedPersons: [{ name: "Alice", relation: "Aunt", mobile: "1234567890" }]
    };
    expect(studentRegistrationSchema.safeParse(validData).success).toBe(true);
  });

  it('validates transport conditional logic in visitorSchema', () => {
    const fileMock = new File([""], "test.png", { type: "image/png" });
    const baseData = {
      visitorType: "parent", name: "John Doe", totalPeople: 1, males: 1, females: 0,
      members: [{ name: "John Doe", photo: [fileMock] }],
      arrivalDate: "2050-01-01T10:00", departureDate: "2050-01-02T10:00",
      hostName: "Host", hostId: "ABCDE12345", hostCourse: "BTECH", hostHostel: "Main Hostel"
    };

    // 1. Bus (No vehicle no required -> PASSES)
    expect(visitorSchema.safeParse({ ...baseData, transportMode: "Bus", vehicleNo: "" }).success).toBe(true);
    
    // 2. Car without vehicle no (Triggers error branch -> FAILS)
    expect(visitorSchema.safeParse({ ...baseData, transportMode: "Car", vehicleNo: "" }).success).toBe(false);

    // 3. Car with vehicle no (Satisfies branch -> PASSES)
    expect(visitorSchema.safeParse({ ...baseData, transportMode: "Car", vehicleNo: "MH12AB1234" }).success).toBe(true);

    // 4. Missing Departure Date (Triggers date error branch -> FAILS)
    expect(visitorSchema.safeParse({ ...baseData, departureDate: "", transportMode: "Bus" }).success).toBe(false);
  });
});