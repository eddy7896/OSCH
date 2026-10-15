# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createAcademicYear, createSchool, createUser, createClassroom, createStudent, createSchoolMember, createInvoice, createPayroll, createSubject, createSchedule } from '@oruschools/erp-sdk';


// Operation CreateAcademicYear:  For variables, look at type CreateAcademicYearVars in ../index.d.ts
const { data } = await CreateAcademicYear(dataConnect, createAcademicYearVars);

// Operation CreateSchool:  For variables, look at type CreateSchoolVars in ../index.d.ts
const { data } = await CreateSchool(dataConnect, createSchoolVars);

// Operation CreateUser:  For variables, look at type CreateUserVars in ../index.d.ts
const { data } = await CreateUser(dataConnect, createUserVars);

// Operation CreateClassroom:  For variables, look at type CreateClassroomVars in ../index.d.ts
const { data } = await CreateClassroom(dataConnect, createClassroomVars);

// Operation CreateStudent:  For variables, look at type CreateStudentVars in ../index.d.ts
const { data } = await CreateStudent(dataConnect, createStudentVars);

// Operation CreateSchoolMember:  For variables, look at type CreateSchoolMemberVars in ../index.d.ts
const { data } = await CreateSchoolMember(dataConnect, createSchoolMemberVars);

// Operation CreateInvoice:  For variables, look at type CreateInvoiceVars in ../index.d.ts
const { data } = await CreateInvoice(dataConnect, createInvoiceVars);

// Operation CreatePayroll:  For variables, look at type CreatePayrollVars in ../index.d.ts
const { data } = await CreatePayroll(dataConnect, createPayrollVars);

// Operation CreateSubject:  For variables, look at type CreateSubjectVars in ../index.d.ts
const { data } = await CreateSubject(dataConnect, createSubjectVars);

// Operation CreateSchedule:  For variables, look at type CreateScheduleVars in ../index.d.ts
const { data } = await CreateSchedule(dataConnect, createScheduleVars);


```