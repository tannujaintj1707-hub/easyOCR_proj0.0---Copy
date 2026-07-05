import { z } from "zod";

// Max file size (e.g., 5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileSelectionSchema = z
  .any()
  .refine((files) => files?.length > 0, "Photo is strictly required to submit.")
  .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, "Max file size is 5MB.")
  .refine(
    (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
    ".jpg, .jpeg, .png and .webp files are accepted."
  );

// Name constraint (Min 2 alphabets, one space allowed between words)
const nameValidation = z.string()
  .trim()
  .regex(/^[A-Za-z]{2,}(?: [A-Za-z]+)*$/, "Invalid input: Name must contain only alphabets and at least 2 letters");

// Email Constraint
const emailValidation = z.string()
  .trim()
  .regex(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/, "Invalid input: Please enter a valid email format (e.g., name@gmail.com)")
  .optional().or(z.literal(""));

// Mobile Number Constraint
const mobileValidation = z.string()
  .trim()
  .regex(/^\d{10}$/, "Invalid input: Phone number must be exactly 10 digits (e.g., 9826543612)");

const vehicleValidation = z.string()
  .optional()
  .refine((val) => !val || /^[a-zA-Z0-9]{9,10}$/.test(val.replace(/\s+/g, "")), {
    message: "Vehicle No. must be 9 to 10 alphanumeric characters.",
  });

// 🚨 STRICT STUDENT ID CONSTRAINT (5 UPPERCASE ALPHABETS + 5 NUMBERS)
const studentIdValidation = z.string()
  .regex(/^[A-Z]{5}\d{5}$/, "Student ID must be exactly 5 uppercase letters followed by 5 numbers (e.g., ABCDE12345).");

const arrivalDateValidation = z.string().min(1, "Arrival date is required").refine((val) => {
  const arrivalDateMs = new Date(val).getTime();
  const today = new Date();
  today.setHours(23, 59, 59, 999); 
  return arrivalDateMs > today.getTime();
}, { message: "Form must be filled 24 hours prior. Arrival date must be a future date." });

const baseSchema = z.object({
  visitorType: z.enum(["parent", "student"]),
  name: nameValidation, 
  submittedAt: z.string().optional(),
  status: z.string().optional(),
  receiptId: z.string().optional(),
});

const memberSchema = z.object({
  name: nameValidation,
  photo: fileSelectionSchema 
});

const parentSchema = baseSchema.extend({
  visitorType: z.literal("parent"),
  totalPeople: z.number().min(1, "At least 1 person required"),
  males: z.number().min(0),
  females: z.number().min(0),
  members: z.array(memberSchema).min(1, "At least one member details required"),
  arrivalDate: arrivalDateValidation, 
  departureDate: z.string().min(1, "Departure date is required"),
  transportMode: z.string().min(2, "Transport mode required"),
  vehicleNo: vehicleValidation, 
  hostName: nameValidation,
  hostId: studentIdValidation, 
  hostCourse: z.string().min(1, "Student course required"),
  hostHostel: z.string().min(1, "Student hostel required"),
}).refine((data) => data.males + data.females === data.totalPeople, {
    message: "Sum of males and females must equal total people",
    path: ["totalPeople"],
}).refine((data) => {
    if (!data.arrivalDate || !data.departureDate) return true;
    const arrTime = new Date(data.arrivalDate).getTime();
    const depTime = new Date(data.departureDate).getTime();
    // 🚨 Explicitly ensuring that same day is fine, but time MUST be strictly greater
    return depTime > arrTime;
}, { message: "Departure time must be strictly after the arrival time (Same date is allowed).", path: ["departureDate"] })
.refine((data) => {
    // 🚨 CONDITIONAL VALIDATION: Vehicle Number is mandatory for Car and Taxi
    if (data.transportMode === "Car" || data.transportMode === "Taxi") {
        return !!data.vehicleNo && data.vehicleNo.trim().length > 0;
    }
    return true; // For Bus, Auto, Train, it is not required
}, { message: "Vehicle No. is strictly required for Car and Taxi", path: ["vehicleNo"] });

const studentSchema = baseSchema.extend({
  visitorType: z.literal("student"),
  studentId: studentIdValidation, 
  course: z.string().min(1, "Course selection is required"),
  hostelName: z.string().min(1, "Hostel selection is required"),
  photo: fileSelectionSchema, 
  arrivalDate: arrivalDateValidation, 
  transportMode: z.string().min(2, "Transport mode required"),
  vehicleNo: vehicleValidation, 
}).refine((data) => {
    // 🚨 CONDITIONAL VALIDATION: Vehicle Number is mandatory for Car and Taxi
    if (data.transportMode === "Car" || data.transportMode === "Taxi") {
        return !!data.vehicleNo && data.vehicleNo.trim().length > 0;
    }
    return true; // For Bus, Auto, Train, it is not required
}, { message: "Vehicle No. is strictly required for Car and Taxi", path: ["vehicleNo"] });

export const visitorSchema = z.discriminatedUnion("visitorType", [
  parentSchema,
  studentSchema,
]);


// ==========================================
// 🚨 STRICT STUDENT REGISTRATION CONSTRAINTS
// ==========================================
export const studentRegistrationSchema = z.object({
  studentName: nameValidation,
  studentId: studentIdValidation, 
  
  // 🚨 DOB Constraint: Must be at least 11 years in the past
  dob: z.string().min(1, "Date of Birth is required").refine((val) => {
    const dobDate = new Date(val);
    const today = new Date();
    // Calculate exactly 11 years ago from today
    const elevenYearsAgo = new Date(today.getFullYear() - 11, today.getMonth(), today.getDate());
    
    return dobDate.getTime() <= elevenYearsAgo.getTime();
  }, { 
    message: "Applicant must be at least 11 years old." 
  }),
  
  applyingClass: z.string().min(1, "Class is required"),
  fatherName: nameValidation,
  motherName: nameValidation,
  guardianName: nameValidation,
  
  // 🚨 INCOME Constraint: Mandatory, Numeric Only, Non-Negative, Realistic Range
  guardianIncome: z.string()
    .trim()
    .min(1, "Annual income is required")
    .regex(/^\d+$/, "Income must contain only numbers (No commas or text allowed in database)")
    .refine((val) => parseInt(val, 10) >= 0, "Income cannot be negative")
    .refine((val) => parseInt(val, 10) <= 1000000000, "Income value exceeds realistic bounds"),
  
  mobileNo: mobileValidation,
  email: emailValidation,
  category: z.string().min(1, "Category is required"),
  authorizedPersons: z.array(
    z.object({
      name: nameValidation,
      relation: z.string().min(1, "Relation required"),
      mobile: mobileValidation, 
      address: z.string().optional(),
      photo: z.any().optional(),
    })
  )
  .min(1, "At least one authorized person is required")
  .max(4, "Maximum 4 authorized persons allowed"), // 🚨 Added strict limit of 4
});