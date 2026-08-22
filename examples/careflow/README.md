# CareFlow Example — SpecLore Integration

This directory demonstrates how to integrate SpecLore into a healthcare workflow management system.

## Project Structure

```
careflow/
├── .speclore/
│   ├── config.yaml          # Project configuration
│   └── context.json         # Generated project context
├── specs/
│   ├── patient/
│   │   └── register.feature # Patient registration feature
│   └── appointment/
│       └── schedule.feature # Appointment scheduling feature
└── README.md
```

## Configuration

```yaml
project:
  name: careflow
  language: typescript
  framework: nestjs
  profile: strict
  modules:
    patient:
      path: src/patient
      responsibility: Patient registration, profile management, medical history
      dependsOn: []
      entities: [Patient, MedicalRecord]
      apis: [registerPatient, getPatient, updateProfile]
    appointment:
      path: src/appointment
      responsibility: Appointment scheduling, cancellation, reminders
      dependsOn: [patient]
      entities: [Appointment, TimeSlot]
      apis: [scheduleAppointment, cancelAppointment]

verify:
  command: npm test -- --reporter=json
  timeout: 300
```

## Usage

```bash
# Generate features from requirements
speclore spec "Patient registration requires valid ID and insurance info"

# Generate constraints
speclore code

# Run verification
speclore verify --impact
```
