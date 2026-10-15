# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `erp-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAcademicYears*](#listacademicyears)
  - [*ListClassrooms*](#listclassrooms)
  - [*ListInvoices*](#listinvoices)
  - [*ListStudents*](#liststudents)
  - [*ListStaff*](#liststaff)
  - [*ListPayroll*](#listpayroll)
  - [*ListSubjects*](#listsubjects)
  - [*ListSchedules*](#listschedules)
  - [*ListLeaveRequests*](#listleaverequests)
  - [*ListExams*](#listexams)
- [**Mutations**](#mutations)
  - [*CreateAcademicYear*](#createacademicyear)
  - [*CreateSchool*](#createschool)
  - [*CreateUser*](#createuser)
  - [*CreateClassroom*](#createclassroom)
  - [*CreateStudent*](#createstudent)
  - [*CreateSchoolMember*](#createschoolmember)
  - [*CreateInvoice*](#createinvoice)
  - [*CreatePayroll*](#createpayroll)
  - [*CreateSubject*](#createsubject)
  - [*CreateSchedule*](#createschedule)
  - [*CreateLeaveRequest*](#createleaverequest)
  - [*UpdateLeaveRequest*](#updateleaverequest)
  - [*CreateExam*](#createexam)
  - [*CreateAuditLog*](#createauditlog)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `erp-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@oruschools/erp-sdk` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@oruschools/erp-sdk';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@oruschools/erp-sdk';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `erp-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAcademicYears
You can execute the `ListAcademicYears` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listAcademicYears(vars: ListAcademicYearsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAcademicYearsData, ListAcademicYearsVariables>;

interface ListAcademicYearsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAcademicYearsVariables): QueryRef<ListAcademicYearsData, ListAcademicYearsVariables>;
}
export const listAcademicYearsRef: ListAcademicYearsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAcademicYears(dc: DataConnect, vars: ListAcademicYearsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAcademicYearsData, ListAcademicYearsVariables>;

interface ListAcademicYearsRef {
  ...
  (dc: DataConnect, vars: ListAcademicYearsVariables): QueryRef<ListAcademicYearsData, ListAcademicYearsVariables>;
}
export const listAcademicYearsRef: ListAcademicYearsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAcademicYearsRef:
```typescript
const name = listAcademicYearsRef.operationName;
console.log(name);
```

### Variables
The `ListAcademicYears` query requires an argument of type `ListAcademicYearsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListAcademicYearsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListAcademicYears` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAcademicYearsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAcademicYearsData {
  academicYears: ({
    id: UUIDString;
    name: string;
    startDate: DateString;
    endDate: DateString;
    status: AcademicYearStatus;
  } & AcademicYear_Key)[];
}
```
### Using `ListAcademicYears`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAcademicYears, ListAcademicYearsVariables } from '@oruschools/erp-sdk';

// The `ListAcademicYears` query requires an argument of type `ListAcademicYearsVariables`:
const listAcademicYearsVars: ListAcademicYearsVariables = {
  schoolId: ..., 
};

// Call the `listAcademicYears()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAcademicYears(listAcademicYearsVars);
// Variables can be defined inline as well.
const { data } = await listAcademicYears({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAcademicYears(dataConnect, listAcademicYearsVars);

console.log(data.academicYears);

// Or, you can use the `Promise` API.
listAcademicYears(listAcademicYearsVars).then((response) => {
  const data = response.data;
  console.log(data.academicYears);
});
```

### Using `ListAcademicYears`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAcademicYearsRef, ListAcademicYearsVariables } from '@oruschools/erp-sdk';

// The `ListAcademicYears` query requires an argument of type `ListAcademicYearsVariables`:
const listAcademicYearsVars: ListAcademicYearsVariables = {
  schoolId: ..., 
};

// Call the `listAcademicYearsRef()` function to get a reference to the query.
const ref = listAcademicYearsRef(listAcademicYearsVars);
// Variables can be defined inline as well.
const ref = listAcademicYearsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAcademicYearsRef(dataConnect, listAcademicYearsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.academicYears);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.academicYears);
});
```

## ListClassrooms
You can execute the `ListClassrooms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listClassrooms(vars: ListClassroomsVariables, options?: ExecuteQueryOptions): QueryPromise<ListClassroomsData, ListClassroomsVariables>;

interface ListClassroomsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListClassroomsVariables): QueryRef<ListClassroomsData, ListClassroomsVariables>;
}
export const listClassroomsRef: ListClassroomsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listClassrooms(dc: DataConnect, vars: ListClassroomsVariables, options?: ExecuteQueryOptions): QueryPromise<ListClassroomsData, ListClassroomsVariables>;

interface ListClassroomsRef {
  ...
  (dc: DataConnect, vars: ListClassroomsVariables): QueryRef<ListClassroomsData, ListClassroomsVariables>;
}
export const listClassroomsRef: ListClassroomsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listClassroomsRef:
```typescript
const name = listClassroomsRef.operationName;
console.log(name);
```

### Variables
The `ListClassrooms` query requires an argument of type `ListClassroomsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListClassroomsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListClassrooms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListClassroomsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListClassroomsData {
  classrooms: ({
    id: UUIDString;
    name: string;
    gradeLevel: string;
    capacity: number;
  } & Classroom_Key)[];
}
```
### Using `ListClassrooms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listClassrooms, ListClassroomsVariables } from '@oruschools/erp-sdk';

// The `ListClassrooms` query requires an argument of type `ListClassroomsVariables`:
const listClassroomsVars: ListClassroomsVariables = {
  schoolId: ..., 
};

// Call the `listClassrooms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listClassrooms(listClassroomsVars);
// Variables can be defined inline as well.
const { data } = await listClassrooms({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listClassrooms(dataConnect, listClassroomsVars);

console.log(data.classrooms);

// Or, you can use the `Promise` API.
listClassrooms(listClassroomsVars).then((response) => {
  const data = response.data;
  console.log(data.classrooms);
});
```

### Using `ListClassrooms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listClassroomsRef, ListClassroomsVariables } from '@oruschools/erp-sdk';

// The `ListClassrooms` query requires an argument of type `ListClassroomsVariables`:
const listClassroomsVars: ListClassroomsVariables = {
  schoolId: ..., 
};

// Call the `listClassroomsRef()` function to get a reference to the query.
const ref = listClassroomsRef(listClassroomsVars);
// Variables can be defined inline as well.
const ref = listClassroomsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listClassroomsRef(dataConnect, listClassroomsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.classrooms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.classrooms);
});
```

## ListInvoices
You can execute the `ListInvoices` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listInvoices(vars: ListInvoicesVariables, options?: ExecuteQueryOptions): QueryPromise<ListInvoicesData, ListInvoicesVariables>;

interface ListInvoicesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListInvoicesVariables): QueryRef<ListInvoicesData, ListInvoicesVariables>;
}
export const listInvoicesRef: ListInvoicesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listInvoices(dc: DataConnect, vars: ListInvoicesVariables, options?: ExecuteQueryOptions): QueryPromise<ListInvoicesData, ListInvoicesVariables>;

interface ListInvoicesRef {
  ...
  (dc: DataConnect, vars: ListInvoicesVariables): QueryRef<ListInvoicesData, ListInvoicesVariables>;
}
export const listInvoicesRef: ListInvoicesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listInvoicesRef:
```typescript
const name = listInvoicesRef.operationName;
console.log(name);
```

### Variables
The `ListInvoices` query requires an argument of type `ListInvoicesVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListInvoicesVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListInvoices` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListInvoicesData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListInvoicesData {
  invoices: ({
    id: UUIDString;
    amountMinor: Int64String;
    dueDate: DateString;
    status: InvoiceStatus;
    student: {
      firstName: string;
      lastName: string;
      enrollmentId: string;
    };
  } & Invoice_Key)[];
}
```
### Using `ListInvoices`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listInvoices, ListInvoicesVariables } from '@oruschools/erp-sdk';

// The `ListInvoices` query requires an argument of type `ListInvoicesVariables`:
const listInvoicesVars: ListInvoicesVariables = {
  schoolId: ..., 
};

// Call the `listInvoices()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listInvoices(listInvoicesVars);
// Variables can be defined inline as well.
const { data } = await listInvoices({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listInvoices(dataConnect, listInvoicesVars);

console.log(data.invoices);

// Or, you can use the `Promise` API.
listInvoices(listInvoicesVars).then((response) => {
  const data = response.data;
  console.log(data.invoices);
});
```

### Using `ListInvoices`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listInvoicesRef, ListInvoicesVariables } from '@oruschools/erp-sdk';

// The `ListInvoices` query requires an argument of type `ListInvoicesVariables`:
const listInvoicesVars: ListInvoicesVariables = {
  schoolId: ..., 
};

// Call the `listInvoicesRef()` function to get a reference to the query.
const ref = listInvoicesRef(listInvoicesVars);
// Variables can be defined inline as well.
const ref = listInvoicesRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listInvoicesRef(dataConnect, listInvoicesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.invoices);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.invoices);
});
```

## ListStudents
You can execute the `ListStudents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listStudents(vars: ListStudentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListStudentsData, ListStudentsVariables>;

interface ListStudentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListStudentsVariables): QueryRef<ListStudentsData, ListStudentsVariables>;
}
export const listStudentsRef: ListStudentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listStudents(dc: DataConnect, vars: ListStudentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListStudentsData, ListStudentsVariables>;

interface ListStudentsRef {
  ...
  (dc: DataConnect, vars: ListStudentsVariables): QueryRef<ListStudentsData, ListStudentsVariables>;
}
export const listStudentsRef: ListStudentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listStudentsRef:
```typescript
const name = listStudentsRef.operationName;
console.log(name);
```

### Variables
The `ListStudents` query requires an argument of type `ListStudentsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListStudentsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListStudents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListStudentsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListStudentsData {
  students: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    enrollmentId: string;
    gradeLevel: string;
  } & Student_Key)[];
}
```
### Using `ListStudents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listStudents, ListStudentsVariables } from '@oruschools/erp-sdk';

// The `ListStudents` query requires an argument of type `ListStudentsVariables`:
const listStudentsVars: ListStudentsVariables = {
  schoolId: ..., 
};

// Call the `listStudents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listStudents(listStudentsVars);
// Variables can be defined inline as well.
const { data } = await listStudents({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listStudents(dataConnect, listStudentsVars);

console.log(data.students);

// Or, you can use the `Promise` API.
listStudents(listStudentsVars).then((response) => {
  const data = response.data;
  console.log(data.students);
});
```

### Using `ListStudents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listStudentsRef, ListStudentsVariables } from '@oruschools/erp-sdk';

// The `ListStudents` query requires an argument of type `ListStudentsVariables`:
const listStudentsVars: ListStudentsVariables = {
  schoolId: ..., 
};

// Call the `listStudentsRef()` function to get a reference to the query.
const ref = listStudentsRef(listStudentsVars);
// Variables can be defined inline as well.
const ref = listStudentsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listStudentsRef(dataConnect, listStudentsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.students);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.students);
});
```

## ListStaff
You can execute the `ListStaff` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listStaff(vars: ListStaffVariables, options?: ExecuteQueryOptions): QueryPromise<ListStaffData, ListStaffVariables>;

interface ListStaffRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListStaffVariables): QueryRef<ListStaffData, ListStaffVariables>;
}
export const listStaffRef: ListStaffRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listStaff(dc: DataConnect, vars: ListStaffVariables, options?: ExecuteQueryOptions): QueryPromise<ListStaffData, ListStaffVariables>;

interface ListStaffRef {
  ...
  (dc: DataConnect, vars: ListStaffVariables): QueryRef<ListStaffData, ListStaffVariables>;
}
export const listStaffRef: ListStaffRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listStaffRef:
```typescript
const name = listStaffRef.operationName;
console.log(name);
```

### Variables
The `ListStaff` query requires an argument of type `ListStaffVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListStaffVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListStaff` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListStaffData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListStaffData {
  schoolMembers: ({
    schoolRole: SchoolRole;
    user: {
      id: string;
      email: string;
      phoneNumber?: string | null;
      globalRole: GlobalRole;
    } & User_Key;
  })[];
}
```
### Using `ListStaff`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listStaff, ListStaffVariables } from '@oruschools/erp-sdk';

// The `ListStaff` query requires an argument of type `ListStaffVariables`:
const listStaffVars: ListStaffVariables = {
  schoolId: ..., 
};

// Call the `listStaff()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listStaff(listStaffVars);
// Variables can be defined inline as well.
const { data } = await listStaff({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listStaff(dataConnect, listStaffVars);

console.log(data.schoolMembers);

// Or, you can use the `Promise` API.
listStaff(listStaffVars).then((response) => {
  const data = response.data;
  console.log(data.schoolMembers);
});
```

### Using `ListStaff`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listStaffRef, ListStaffVariables } from '@oruschools/erp-sdk';

// The `ListStaff` query requires an argument of type `ListStaffVariables`:
const listStaffVars: ListStaffVariables = {
  schoolId: ..., 
};

// Call the `listStaffRef()` function to get a reference to the query.
const ref = listStaffRef(listStaffVars);
// Variables can be defined inline as well.
const ref = listStaffRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listStaffRef(dataConnect, listStaffVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.schoolMembers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.schoolMembers);
});
```

## ListPayroll
You can execute the `ListPayroll` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listPayroll(vars: ListPayrollVariables, options?: ExecuteQueryOptions): QueryPromise<ListPayrollData, ListPayrollVariables>;

interface ListPayrollRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPayrollVariables): QueryRef<ListPayrollData, ListPayrollVariables>;
}
export const listPayrollRef: ListPayrollRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPayroll(dc: DataConnect, vars: ListPayrollVariables, options?: ExecuteQueryOptions): QueryPromise<ListPayrollData, ListPayrollVariables>;

interface ListPayrollRef {
  ...
  (dc: DataConnect, vars: ListPayrollVariables): QueryRef<ListPayrollData, ListPayrollVariables>;
}
export const listPayrollRef: ListPayrollRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPayrollRef:
```typescript
const name = listPayrollRef.operationName;
console.log(name);
```

### Variables
The `ListPayroll` query requires an argument of type `ListPayrollVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListPayrollVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListPayroll` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPayrollData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPayrollData {
  payrolls: ({
    id: UUIDString;
    amountMinor: Int64String;
    payDate: DateString;
    status: PayrollStatus;
    user: {
      id: string;
      email: string;
    } & User_Key;
  } & Payroll_Key)[];
}
```
### Using `ListPayroll`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPayroll, ListPayrollVariables } from '@oruschools/erp-sdk';

// The `ListPayroll` query requires an argument of type `ListPayrollVariables`:
const listPayrollVars: ListPayrollVariables = {
  schoolId: ..., 
};

// Call the `listPayroll()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPayroll(listPayrollVars);
// Variables can be defined inline as well.
const { data } = await listPayroll({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPayroll(dataConnect, listPayrollVars);

console.log(data.payrolls);

// Or, you can use the `Promise` API.
listPayroll(listPayrollVars).then((response) => {
  const data = response.data;
  console.log(data.payrolls);
});
```

### Using `ListPayroll`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPayrollRef, ListPayrollVariables } from '@oruschools/erp-sdk';

// The `ListPayroll` query requires an argument of type `ListPayrollVariables`:
const listPayrollVars: ListPayrollVariables = {
  schoolId: ..., 
};

// Call the `listPayrollRef()` function to get a reference to the query.
const ref = listPayrollRef(listPayrollVars);
// Variables can be defined inline as well.
const ref = listPayrollRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPayrollRef(dataConnect, listPayrollVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.payrolls);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.payrolls);
});
```

## ListSubjects
You can execute the `ListSubjects` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listSubjects(vars: ListSubjectsVariables, options?: ExecuteQueryOptions): QueryPromise<ListSubjectsData, ListSubjectsVariables>;

interface ListSubjectsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSubjectsVariables): QueryRef<ListSubjectsData, ListSubjectsVariables>;
}
export const listSubjectsRef: ListSubjectsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSubjects(dc: DataConnect, vars: ListSubjectsVariables, options?: ExecuteQueryOptions): QueryPromise<ListSubjectsData, ListSubjectsVariables>;

interface ListSubjectsRef {
  ...
  (dc: DataConnect, vars: ListSubjectsVariables): QueryRef<ListSubjectsData, ListSubjectsVariables>;
}
export const listSubjectsRef: ListSubjectsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSubjectsRef:
```typescript
const name = listSubjectsRef.operationName;
console.log(name);
```

### Variables
The `ListSubjects` query requires an argument of type `ListSubjectsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListSubjectsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListSubjects` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSubjectsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListSubjectsData {
  subjects: ({
    id: UUIDString;
    name: string;
    code: string;
  } & Subject_Key)[];
}
```
### Using `ListSubjects`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSubjects, ListSubjectsVariables } from '@oruschools/erp-sdk';

// The `ListSubjects` query requires an argument of type `ListSubjectsVariables`:
const listSubjectsVars: ListSubjectsVariables = {
  schoolId: ..., 
};

// Call the `listSubjects()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSubjects(listSubjectsVars);
// Variables can be defined inline as well.
const { data } = await listSubjects({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSubjects(dataConnect, listSubjectsVars);

console.log(data.subjects);

// Or, you can use the `Promise` API.
listSubjects(listSubjectsVars).then((response) => {
  const data = response.data;
  console.log(data.subjects);
});
```

### Using `ListSubjects`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSubjectsRef, ListSubjectsVariables } from '@oruschools/erp-sdk';

// The `ListSubjects` query requires an argument of type `ListSubjectsVariables`:
const listSubjectsVars: ListSubjectsVariables = {
  schoolId: ..., 
};

// Call the `listSubjectsRef()` function to get a reference to the query.
const ref = listSubjectsRef(listSubjectsVars);
// Variables can be defined inline as well.
const ref = listSubjectsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSubjectsRef(dataConnect, listSubjectsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.subjects);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.subjects);
});
```

## ListSchedules
You can execute the `ListSchedules` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listSchedules(vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListSchedulesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
}
export const listSchedulesRef: ListSchedulesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListSchedulesRef {
  ...
  (dc: DataConnect, vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
}
export const listSchedulesRef: ListSchedulesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSchedulesRef:
```typescript
const name = listSchedulesRef.operationName;
console.log(name);
```

### Variables
The `ListSchedules` query requires an argument of type `ListSchedulesVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListSchedulesVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListSchedules` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSchedulesData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListSchedulesData {
  classSchedules: ({
    id: UUIDString;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    classroom: {
      name: string;
    };
    subject: {
      name: string;
    };
    teacher: {
      email: string;
    };
  } & ClassSchedule_Key)[];
}
```
### Using `ListSchedules`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSchedules, ListSchedulesVariables } from '@oruschools/erp-sdk';

// The `ListSchedules` query requires an argument of type `ListSchedulesVariables`:
const listSchedulesVars: ListSchedulesVariables = {
  schoolId: ..., 
};

// Call the `listSchedules()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSchedules(listSchedulesVars);
// Variables can be defined inline as well.
const { data } = await listSchedules({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSchedules(dataConnect, listSchedulesVars);

console.log(data.classSchedules);

// Or, you can use the `Promise` API.
listSchedules(listSchedulesVars).then((response) => {
  const data = response.data;
  console.log(data.classSchedules);
});
```

### Using `ListSchedules`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSchedulesRef, ListSchedulesVariables } from '@oruschools/erp-sdk';

// The `ListSchedules` query requires an argument of type `ListSchedulesVariables`:
const listSchedulesVars: ListSchedulesVariables = {
  schoolId: ..., 
};

// Call the `listSchedulesRef()` function to get a reference to the query.
const ref = listSchedulesRef(listSchedulesVars);
// Variables can be defined inline as well.
const ref = listSchedulesRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSchedulesRef(dataConnect, listSchedulesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.classSchedules);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.classSchedules);
});
```

## ListLeaveRequests
You can execute the `ListLeaveRequests` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listLeaveRequests(vars: ListLeaveRequestsVariables, options?: ExecuteQueryOptions): QueryPromise<ListLeaveRequestsData, ListLeaveRequestsVariables>;

interface ListLeaveRequestsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLeaveRequestsVariables): QueryRef<ListLeaveRequestsData, ListLeaveRequestsVariables>;
}
export const listLeaveRequestsRef: ListLeaveRequestsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listLeaveRequests(dc: DataConnect, vars: ListLeaveRequestsVariables, options?: ExecuteQueryOptions): QueryPromise<ListLeaveRequestsData, ListLeaveRequestsVariables>;

interface ListLeaveRequestsRef {
  ...
  (dc: DataConnect, vars: ListLeaveRequestsVariables): QueryRef<ListLeaveRequestsData, ListLeaveRequestsVariables>;
}
export const listLeaveRequestsRef: ListLeaveRequestsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listLeaveRequestsRef:
```typescript
const name = listLeaveRequestsRef.operationName;
console.log(name);
```

### Variables
The `ListLeaveRequests` query requires an argument of type `ListLeaveRequestsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListLeaveRequestsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListLeaveRequests` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListLeaveRequestsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListLeaveRequestsData {
  leaveRequests: ({
    id: UUIDString;
    startDate: DateString;
    endDate: DateString;
    reason?: string | null;
    status: LeaveStatus;
    user: {
      email: string;
    };
    substitute?: {
      email: string;
    };
  } & LeaveRequest_Key)[];
}
```
### Using `ListLeaveRequests`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listLeaveRequests, ListLeaveRequestsVariables } from '@oruschools/erp-sdk';

// The `ListLeaveRequests` query requires an argument of type `ListLeaveRequestsVariables`:
const listLeaveRequestsVars: ListLeaveRequestsVariables = {
  schoolId: ..., 
};

// Call the `listLeaveRequests()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listLeaveRequests(listLeaveRequestsVars);
// Variables can be defined inline as well.
const { data } = await listLeaveRequests({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listLeaveRequests(dataConnect, listLeaveRequestsVars);

console.log(data.leaveRequests);

// Or, you can use the `Promise` API.
listLeaveRequests(listLeaveRequestsVars).then((response) => {
  const data = response.data;
  console.log(data.leaveRequests);
});
```

### Using `ListLeaveRequests`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listLeaveRequestsRef, ListLeaveRequestsVariables } from '@oruschools/erp-sdk';

// The `ListLeaveRequests` query requires an argument of type `ListLeaveRequestsVariables`:
const listLeaveRequestsVars: ListLeaveRequestsVariables = {
  schoolId: ..., 
};

// Call the `listLeaveRequestsRef()` function to get a reference to the query.
const ref = listLeaveRequestsRef(listLeaveRequestsVars);
// Variables can be defined inline as well.
const ref = listLeaveRequestsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listLeaveRequestsRef(dataConnect, listLeaveRequestsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.leaveRequests);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.leaveRequests);
});
```

## ListExams
You can execute the `ListExams` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listExams(vars: ListExamsVariables, options?: ExecuteQueryOptions): QueryPromise<ListExamsData, ListExamsVariables>;

interface ListExamsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListExamsVariables): QueryRef<ListExamsData, ListExamsVariables>;
}
export const listExamsRef: ListExamsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listExams(dc: DataConnect, vars: ListExamsVariables, options?: ExecuteQueryOptions): QueryPromise<ListExamsData, ListExamsVariables>;

interface ListExamsRef {
  ...
  (dc: DataConnect, vars: ListExamsVariables): QueryRef<ListExamsData, ListExamsVariables>;
}
export const listExamsRef: ListExamsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listExamsRef:
```typescript
const name = listExamsRef.operationName;
console.log(name);
```

### Variables
The `ListExams` query requires an argument of type `ListExamsVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListExamsVariables {
  schoolId: UUIDString;
}
```
### Return Type
Recall that executing the `ListExams` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListExamsData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListExamsData {
  exams: ({
    id: UUIDString;
    title: string;
    examDate: DateString;
    maxScore: number;
    classroom: {
      name: string;
    };
    subject: {
      name: string;
    };
  } & Exam_Key)[];
}
```
### Using `ListExams`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listExams, ListExamsVariables } from '@oruschools/erp-sdk';

// The `ListExams` query requires an argument of type `ListExamsVariables`:
const listExamsVars: ListExamsVariables = {
  schoolId: ..., 
};

// Call the `listExams()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listExams(listExamsVars);
// Variables can be defined inline as well.
const { data } = await listExams({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listExams(dataConnect, listExamsVars);

console.log(data.exams);

// Or, you can use the `Promise` API.
listExams(listExamsVars).then((response) => {
  const data = response.data;
  console.log(data.exams);
});
```

### Using `ListExams`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listExamsRef, ListExamsVariables } from '@oruschools/erp-sdk';

// The `ListExams` query requires an argument of type `ListExamsVariables`:
const listExamsVars: ListExamsVariables = {
  schoolId: ..., 
};

// Call the `listExamsRef()` function to get a reference to the query.
const ref = listExamsRef(listExamsVars);
// Variables can be defined inline as well.
const ref = listExamsRef({ schoolId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listExamsRef(dataConnect, listExamsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.exams);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.exams);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `erp-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAcademicYear
You can execute the `CreateAcademicYear` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createAcademicYear(vars: CreateAcademicYearVariables): MutationPromise<CreateAcademicYearData, CreateAcademicYearVariables>;

interface CreateAcademicYearRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAcademicYearVariables): MutationRef<CreateAcademicYearData, CreateAcademicYearVariables>;
}
export const createAcademicYearRef: CreateAcademicYearRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAcademicYear(dc: DataConnect, vars: CreateAcademicYearVariables): MutationPromise<CreateAcademicYearData, CreateAcademicYearVariables>;

interface CreateAcademicYearRef {
  ...
  (dc: DataConnect, vars: CreateAcademicYearVariables): MutationRef<CreateAcademicYearData, CreateAcademicYearVariables>;
}
export const createAcademicYearRef: CreateAcademicYearRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAcademicYearRef:
```typescript
const name = createAcademicYearRef.operationName;
console.log(name);
```

### Variables
The `CreateAcademicYear` mutation requires an argument of type `CreateAcademicYearVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAcademicYearVariables {
  schoolId: UUIDString;
  name: string;
  startDate: DateString;
  endDate: DateString;
}
```
### Return Type
Recall that executing the `CreateAcademicYear` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAcademicYearData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAcademicYearData {
  academicYear_insert: AcademicYear_Key;
}
```
### Using `CreateAcademicYear`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAcademicYear, CreateAcademicYearVariables } from '@oruschools/erp-sdk';

// The `CreateAcademicYear` mutation requires an argument of type `CreateAcademicYearVariables`:
const createAcademicYearVars: CreateAcademicYearVariables = {
  schoolId: ..., 
  name: ..., 
  startDate: ..., 
  endDate: ..., 
};

// Call the `createAcademicYear()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAcademicYear(createAcademicYearVars);
// Variables can be defined inline as well.
const { data } = await createAcademicYear({ schoolId: ..., name: ..., startDate: ..., endDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAcademicYear(dataConnect, createAcademicYearVars);

console.log(data.academicYear_insert);

// Or, you can use the `Promise` API.
createAcademicYear(createAcademicYearVars).then((response) => {
  const data = response.data;
  console.log(data.academicYear_insert);
});
```

### Using `CreateAcademicYear`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAcademicYearRef, CreateAcademicYearVariables } from '@oruschools/erp-sdk';

// The `CreateAcademicYear` mutation requires an argument of type `CreateAcademicYearVariables`:
const createAcademicYearVars: CreateAcademicYearVariables = {
  schoolId: ..., 
  name: ..., 
  startDate: ..., 
  endDate: ..., 
};

// Call the `createAcademicYearRef()` function to get a reference to the mutation.
const ref = createAcademicYearRef(createAcademicYearVars);
// Variables can be defined inline as well.
const ref = createAcademicYearRef({ schoolId: ..., name: ..., startDate: ..., endDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAcademicYearRef(dataConnect, createAcademicYearVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.academicYear_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.academicYear_insert);
});
```

## CreateSchool
You can execute the `CreateSchool` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createSchool(vars: CreateSchoolVariables): MutationPromise<CreateSchoolData, CreateSchoolVariables>;

interface CreateSchoolRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSchoolVariables): MutationRef<CreateSchoolData, CreateSchoolVariables>;
}
export const createSchoolRef: CreateSchoolRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createSchool(dc: DataConnect, vars: CreateSchoolVariables): MutationPromise<CreateSchoolData, CreateSchoolVariables>;

interface CreateSchoolRef {
  ...
  (dc: DataConnect, vars: CreateSchoolVariables): MutationRef<CreateSchoolData, CreateSchoolVariables>;
}
export const createSchoolRef: CreateSchoolRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createSchoolRef:
```typescript
const name = createSchoolRef.operationName;
console.log(name);
```

### Variables
The `CreateSchool` mutation requires an argument of type `CreateSchoolVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateSchoolVariables {
  id: UUIDString;
  name: string;
  subDomain: string;
}
```
### Return Type
Recall that executing the `CreateSchool` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateSchoolData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateSchoolData {
  school_insert: School_Key;
}
```
### Using `CreateSchool`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSchool, CreateSchoolVariables } from '@oruschools/erp-sdk';

// The `CreateSchool` mutation requires an argument of type `CreateSchoolVariables`:
const createSchoolVars: CreateSchoolVariables = {
  id: ..., 
  name: ..., 
  subDomain: ..., 
};

// Call the `createSchool()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createSchool(createSchoolVars);
// Variables can be defined inline as well.
const { data } = await createSchool({ id: ..., name: ..., subDomain: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createSchool(dataConnect, createSchoolVars);

console.log(data.school_insert);

// Or, you can use the `Promise` API.
createSchool(createSchoolVars).then((response) => {
  const data = response.data;
  console.log(data.school_insert);
});
```

### Using `CreateSchool`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createSchoolRef, CreateSchoolVariables } from '@oruschools/erp-sdk';

// The `CreateSchool` mutation requires an argument of type `CreateSchoolVariables`:
const createSchoolVars: CreateSchoolVariables = {
  id: ..., 
  name: ..., 
  subDomain: ..., 
};

// Call the `createSchoolRef()` function to get a reference to the mutation.
const ref = createSchoolRef(createSchoolVars);
// Variables can be defined inline as well.
const ref = createSchoolRef({ id: ..., name: ..., subDomain: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createSchoolRef(dataConnect, createSchoolVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.school_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.school_insert);
});
```

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation requires an argument of type `CreateUserVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserVariables {
  id: string;
  email: string;
  globalRole: GlobalRole;
}
```
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser, CreateUserVariables } from '@oruschools/erp-sdk';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  id: ..., 
  email: ..., 
  globalRole: ..., 
};

// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser(createUserVars);
// Variables can be defined inline as well.
const { data } = await createUser({ id: ..., email: ..., globalRole: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect, createUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser(createUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef, CreateUserVariables } from '@oruschools/erp-sdk';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  id: ..., 
  email: ..., 
  globalRole: ..., 
};

// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef(createUserVars);
// Variables can be defined inline as well.
const ref = createUserRef({ id: ..., email: ..., globalRole: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect, createUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateClassroom
You can execute the `CreateClassroom` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createClassroom(vars: CreateClassroomVariables): MutationPromise<CreateClassroomData, CreateClassroomVariables>;

interface CreateClassroomRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateClassroomVariables): MutationRef<CreateClassroomData, CreateClassroomVariables>;
}
export const createClassroomRef: CreateClassroomRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createClassroom(dc: DataConnect, vars: CreateClassroomVariables): MutationPromise<CreateClassroomData, CreateClassroomVariables>;

interface CreateClassroomRef {
  ...
  (dc: DataConnect, vars: CreateClassroomVariables): MutationRef<CreateClassroomData, CreateClassroomVariables>;
}
export const createClassroomRef: CreateClassroomRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createClassroomRef:
```typescript
const name = createClassroomRef.operationName;
console.log(name);
```

### Variables
The `CreateClassroom` mutation requires an argument of type `CreateClassroomVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateClassroomVariables {
  schoolId: UUIDString;
  name: string;
  gradeLevel: string;
  capacity: number;
}
```
### Return Type
Recall that executing the `CreateClassroom` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateClassroomData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateClassroomData {
  classroom_insert: Classroom_Key;
}
```
### Using `CreateClassroom`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createClassroom, CreateClassroomVariables } from '@oruschools/erp-sdk';

// The `CreateClassroom` mutation requires an argument of type `CreateClassroomVariables`:
const createClassroomVars: CreateClassroomVariables = {
  schoolId: ..., 
  name: ..., 
  gradeLevel: ..., 
  capacity: ..., 
};

// Call the `createClassroom()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createClassroom(createClassroomVars);
// Variables can be defined inline as well.
const { data } = await createClassroom({ schoolId: ..., name: ..., gradeLevel: ..., capacity: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createClassroom(dataConnect, createClassroomVars);

console.log(data.classroom_insert);

// Or, you can use the `Promise` API.
createClassroom(createClassroomVars).then((response) => {
  const data = response.data;
  console.log(data.classroom_insert);
});
```

### Using `CreateClassroom`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createClassroomRef, CreateClassroomVariables } from '@oruschools/erp-sdk';

// The `CreateClassroom` mutation requires an argument of type `CreateClassroomVariables`:
const createClassroomVars: CreateClassroomVariables = {
  schoolId: ..., 
  name: ..., 
  gradeLevel: ..., 
  capacity: ..., 
};

// Call the `createClassroomRef()` function to get a reference to the mutation.
const ref = createClassroomRef(createClassroomVars);
// Variables can be defined inline as well.
const ref = createClassroomRef({ schoolId: ..., name: ..., gradeLevel: ..., capacity: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createClassroomRef(dataConnect, createClassroomVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.classroom_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.classroom_insert);
});
```

## CreateStudent
You can execute the `CreateStudent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createStudent(vars: CreateStudentVariables): MutationPromise<CreateStudentData, CreateStudentVariables>;

interface CreateStudentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStudentVariables): MutationRef<CreateStudentData, CreateStudentVariables>;
}
export const createStudentRef: CreateStudentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStudent(dc: DataConnect, vars: CreateStudentVariables): MutationPromise<CreateStudentData, CreateStudentVariables>;

interface CreateStudentRef {
  ...
  (dc: DataConnect, vars: CreateStudentVariables): MutationRef<CreateStudentData, CreateStudentVariables>;
}
export const createStudentRef: CreateStudentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStudentRef:
```typescript
const name = createStudentRef.operationName;
console.log(name);
```

### Variables
The `CreateStudent` mutation requires an argument of type `CreateStudentVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStudentVariables {
  schoolId: UUIDString;
  firstName: string;
  lastName: string;
  enrollmentId: string;
  gradeLevel: string;
}
```
### Return Type
Recall that executing the `CreateStudent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStudentData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStudentData {
  student_insert: Student_Key;
}
```
### Using `CreateStudent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStudent, CreateStudentVariables } from '@oruschools/erp-sdk';

// The `CreateStudent` mutation requires an argument of type `CreateStudentVariables`:
const createStudentVars: CreateStudentVariables = {
  schoolId: ..., 
  firstName: ..., 
  lastName: ..., 
  enrollmentId: ..., 
  gradeLevel: ..., 
};

// Call the `createStudent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStudent(createStudentVars);
// Variables can be defined inline as well.
const { data } = await createStudent({ schoolId: ..., firstName: ..., lastName: ..., enrollmentId: ..., gradeLevel: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStudent(dataConnect, createStudentVars);

console.log(data.student_insert);

// Or, you can use the `Promise` API.
createStudent(createStudentVars).then((response) => {
  const data = response.data;
  console.log(data.student_insert);
});
```

### Using `CreateStudent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStudentRef, CreateStudentVariables } from '@oruschools/erp-sdk';

// The `CreateStudent` mutation requires an argument of type `CreateStudentVariables`:
const createStudentVars: CreateStudentVariables = {
  schoolId: ..., 
  firstName: ..., 
  lastName: ..., 
  enrollmentId: ..., 
  gradeLevel: ..., 
};

// Call the `createStudentRef()` function to get a reference to the mutation.
const ref = createStudentRef(createStudentVars);
// Variables can be defined inline as well.
const ref = createStudentRef({ schoolId: ..., firstName: ..., lastName: ..., enrollmentId: ..., gradeLevel: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStudentRef(dataConnect, createStudentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.student_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.student_insert);
});
```

## CreateSchoolMember
You can execute the `CreateSchoolMember` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createSchoolMember(vars: CreateSchoolMemberVariables): MutationPromise<CreateSchoolMemberData, CreateSchoolMemberVariables>;

interface CreateSchoolMemberRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSchoolMemberVariables): MutationRef<CreateSchoolMemberData, CreateSchoolMemberVariables>;
}
export const createSchoolMemberRef: CreateSchoolMemberRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createSchoolMember(dc: DataConnect, vars: CreateSchoolMemberVariables): MutationPromise<CreateSchoolMemberData, CreateSchoolMemberVariables>;

interface CreateSchoolMemberRef {
  ...
  (dc: DataConnect, vars: CreateSchoolMemberVariables): MutationRef<CreateSchoolMemberData, CreateSchoolMemberVariables>;
}
export const createSchoolMemberRef: CreateSchoolMemberRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createSchoolMemberRef:
```typescript
const name = createSchoolMemberRef.operationName;
console.log(name);
```

### Variables
The `CreateSchoolMember` mutation requires an argument of type `CreateSchoolMemberVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateSchoolMemberVariables {
  schoolId: UUIDString;
  userId: string;
  schoolRole: SchoolRole;
}
```
### Return Type
Recall that executing the `CreateSchoolMember` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateSchoolMemberData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateSchoolMemberData {
  schoolMember_insert: SchoolMember_Key;
}
```
### Using `CreateSchoolMember`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSchoolMember, CreateSchoolMemberVariables } from '@oruschools/erp-sdk';

// The `CreateSchoolMember` mutation requires an argument of type `CreateSchoolMemberVariables`:
const createSchoolMemberVars: CreateSchoolMemberVariables = {
  schoolId: ..., 
  userId: ..., 
  schoolRole: ..., 
};

// Call the `createSchoolMember()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createSchoolMember(createSchoolMemberVars);
// Variables can be defined inline as well.
const { data } = await createSchoolMember({ schoolId: ..., userId: ..., schoolRole: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createSchoolMember(dataConnect, createSchoolMemberVars);

console.log(data.schoolMember_insert);

// Or, you can use the `Promise` API.
createSchoolMember(createSchoolMemberVars).then((response) => {
  const data = response.data;
  console.log(data.schoolMember_insert);
});
```

### Using `CreateSchoolMember`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createSchoolMemberRef, CreateSchoolMemberVariables } from '@oruschools/erp-sdk';

// The `CreateSchoolMember` mutation requires an argument of type `CreateSchoolMemberVariables`:
const createSchoolMemberVars: CreateSchoolMemberVariables = {
  schoolId: ..., 
  userId: ..., 
  schoolRole: ..., 
};

// Call the `createSchoolMemberRef()` function to get a reference to the mutation.
const ref = createSchoolMemberRef(createSchoolMemberVars);
// Variables can be defined inline as well.
const ref = createSchoolMemberRef({ schoolId: ..., userId: ..., schoolRole: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createSchoolMemberRef(dataConnect, createSchoolMemberVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.schoolMember_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.schoolMember_insert);
});
```

## CreateInvoice
You can execute the `CreateInvoice` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createInvoice(vars: CreateInvoiceVariables): MutationPromise<CreateInvoiceData, CreateInvoiceVariables>;

interface CreateInvoiceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateInvoiceVariables): MutationRef<CreateInvoiceData, CreateInvoiceVariables>;
}
export const createInvoiceRef: CreateInvoiceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createInvoice(dc: DataConnect, vars: CreateInvoiceVariables): MutationPromise<CreateInvoiceData, CreateInvoiceVariables>;

interface CreateInvoiceRef {
  ...
  (dc: DataConnect, vars: CreateInvoiceVariables): MutationRef<CreateInvoiceData, CreateInvoiceVariables>;
}
export const createInvoiceRef: CreateInvoiceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createInvoiceRef:
```typescript
const name = createInvoiceRef.operationName;
console.log(name);
```

### Variables
The `CreateInvoice` mutation requires an argument of type `CreateInvoiceVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateInvoiceVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  amountMinor: Int64String;
  dueDate: DateString;
}
```
### Return Type
Recall that executing the `CreateInvoice` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateInvoiceData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateInvoiceData {
  query?: {
    students: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  invoice_insert: Invoice_Key;
}
```
### Using `CreateInvoice`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createInvoice, CreateInvoiceVariables } from '@oruschools/erp-sdk';

// The `CreateInvoice` mutation requires an argument of type `CreateInvoiceVariables`:
const createInvoiceVars: CreateInvoiceVariables = {
  schoolId: ..., 
  studentId: ..., 
  amountMinor: ..., 
  dueDate: ..., 
};

// Call the `createInvoice()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createInvoice(createInvoiceVars);
// Variables can be defined inline as well.
const { data } = await createInvoice({ schoolId: ..., studentId: ..., amountMinor: ..., dueDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createInvoice(dataConnect, createInvoiceVars);

console.log(data.query);
console.log(data.invoice_insert);

// Or, you can use the `Promise` API.
createInvoice(createInvoiceVars).then((response) => {
  const data = response.data;
  console.log(data.query);
  console.log(data.invoice_insert);
});
```

### Using `CreateInvoice`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createInvoiceRef, CreateInvoiceVariables } from '@oruschools/erp-sdk';

// The `CreateInvoice` mutation requires an argument of type `CreateInvoiceVariables`:
const createInvoiceVars: CreateInvoiceVariables = {
  schoolId: ..., 
  studentId: ..., 
  amountMinor: ..., 
  dueDate: ..., 
};

// Call the `createInvoiceRef()` function to get a reference to the mutation.
const ref = createInvoiceRef(createInvoiceVars);
// Variables can be defined inline as well.
const ref = createInvoiceRef({ schoolId: ..., studentId: ..., amountMinor: ..., dueDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createInvoiceRef(dataConnect, createInvoiceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.query);
console.log(data.invoice_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.query);
  console.log(data.invoice_insert);
});
```

## CreatePayroll
You can execute the `CreatePayroll` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createPayroll(vars: CreatePayrollVariables): MutationPromise<CreatePayrollData, CreatePayrollVariables>;

interface CreatePayrollRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePayrollVariables): MutationRef<CreatePayrollData, CreatePayrollVariables>;
}
export const createPayrollRef: CreatePayrollRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPayroll(dc: DataConnect, vars: CreatePayrollVariables): MutationPromise<CreatePayrollData, CreatePayrollVariables>;

interface CreatePayrollRef {
  ...
  (dc: DataConnect, vars: CreatePayrollVariables): MutationRef<CreatePayrollData, CreatePayrollVariables>;
}
export const createPayrollRef: CreatePayrollRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPayrollRef:
```typescript
const name = createPayrollRef.operationName;
console.log(name);
```

### Variables
The `CreatePayroll` mutation requires an argument of type `CreatePayrollVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePayrollVariables {
  schoolId: UUIDString;
  userId: string;
  amountMinor: Int64String;
  payDate: DateString;
}
```
### Return Type
Recall that executing the `CreatePayroll` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePayrollData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePayrollData {
  payroll_insert: Payroll_Key;
}
```
### Using `CreatePayroll`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPayroll, CreatePayrollVariables } from '@oruschools/erp-sdk';

// The `CreatePayroll` mutation requires an argument of type `CreatePayrollVariables`:
const createPayrollVars: CreatePayrollVariables = {
  schoolId: ..., 
  userId: ..., 
  amountMinor: ..., 
  payDate: ..., 
};

// Call the `createPayroll()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPayroll(createPayrollVars);
// Variables can be defined inline as well.
const { data } = await createPayroll({ schoolId: ..., userId: ..., amountMinor: ..., payDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPayroll(dataConnect, createPayrollVars);

console.log(data.payroll_insert);

// Or, you can use the `Promise` API.
createPayroll(createPayrollVars).then((response) => {
  const data = response.data;
  console.log(data.payroll_insert);
});
```

### Using `CreatePayroll`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPayrollRef, CreatePayrollVariables } from '@oruschools/erp-sdk';

// The `CreatePayroll` mutation requires an argument of type `CreatePayrollVariables`:
const createPayrollVars: CreatePayrollVariables = {
  schoolId: ..., 
  userId: ..., 
  amountMinor: ..., 
  payDate: ..., 
};

// Call the `createPayrollRef()` function to get a reference to the mutation.
const ref = createPayrollRef(createPayrollVars);
// Variables can be defined inline as well.
const ref = createPayrollRef({ schoolId: ..., userId: ..., amountMinor: ..., payDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPayrollRef(dataConnect, createPayrollVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.payroll_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.payroll_insert);
});
```

## CreateSubject
You can execute the `CreateSubject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createSubject(vars: CreateSubjectVariables): MutationPromise<CreateSubjectData, CreateSubjectVariables>;

interface CreateSubjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSubjectVariables): MutationRef<CreateSubjectData, CreateSubjectVariables>;
}
export const createSubjectRef: CreateSubjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createSubject(dc: DataConnect, vars: CreateSubjectVariables): MutationPromise<CreateSubjectData, CreateSubjectVariables>;

interface CreateSubjectRef {
  ...
  (dc: DataConnect, vars: CreateSubjectVariables): MutationRef<CreateSubjectData, CreateSubjectVariables>;
}
export const createSubjectRef: CreateSubjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createSubjectRef:
```typescript
const name = createSubjectRef.operationName;
console.log(name);
```

### Variables
The `CreateSubject` mutation requires an argument of type `CreateSubjectVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateSubjectVariables {
  schoolId: UUIDString;
  name: string;
  code: string;
}
```
### Return Type
Recall that executing the `CreateSubject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateSubjectData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateSubjectData {
  subject_insert: Subject_Key;
}
```
### Using `CreateSubject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSubject, CreateSubjectVariables } from '@oruschools/erp-sdk';

// The `CreateSubject` mutation requires an argument of type `CreateSubjectVariables`:
const createSubjectVars: CreateSubjectVariables = {
  schoolId: ..., 
  name: ..., 
  code: ..., 
};

// Call the `createSubject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createSubject(createSubjectVars);
// Variables can be defined inline as well.
const { data } = await createSubject({ schoolId: ..., name: ..., code: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createSubject(dataConnect, createSubjectVars);

console.log(data.subject_insert);

// Or, you can use the `Promise` API.
createSubject(createSubjectVars).then((response) => {
  const data = response.data;
  console.log(data.subject_insert);
});
```

### Using `CreateSubject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createSubjectRef, CreateSubjectVariables } from '@oruschools/erp-sdk';

// The `CreateSubject` mutation requires an argument of type `CreateSubjectVariables`:
const createSubjectVars: CreateSubjectVariables = {
  schoolId: ..., 
  name: ..., 
  code: ..., 
};

// Call the `createSubjectRef()` function to get a reference to the mutation.
const ref = createSubjectRef(createSubjectVars);
// Variables can be defined inline as well.
const ref = createSubjectRef({ schoolId: ..., name: ..., code: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createSubjectRef(dataConnect, createSubjectVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.subject_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.subject_insert);
});
```

## CreateSchedule
You can execute the `CreateSchedule` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createSchedule(vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface CreateScheduleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
}
export const createScheduleRef: CreateScheduleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createSchedule(dc: DataConnect, vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface CreateScheduleRef {
  ...
  (dc: DataConnect, vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
}
export const createScheduleRef: CreateScheduleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createScheduleRef:
```typescript
const name = createScheduleRef.operationName;
console.log(name);
```

### Variables
The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateScheduleVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}
```
### Return Type
Recall that executing the `CreateSchedule` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateScheduleData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateScheduleData {
  classSchedule_insert: ClassSchedule_Key;
}
```
### Using `CreateSchedule`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSchedule, CreateScheduleVariables } from '@oruschools/erp-sdk';

// The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`:
const createScheduleVars: CreateScheduleVariables = {
  schoolId: ..., 
  classroomId: ..., 
  subjectId: ..., 
  teacherId: ..., 
  dayOfWeek: ..., 
  startTime: ..., 
  endTime: ..., 
};

// Call the `createSchedule()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createSchedule(createScheduleVars);
// Variables can be defined inline as well.
const { data } = await createSchedule({ schoolId: ..., classroomId: ..., subjectId: ..., teacherId: ..., dayOfWeek: ..., startTime: ..., endTime: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createSchedule(dataConnect, createScheduleVars);

console.log(data.classSchedule_insert);

// Or, you can use the `Promise` API.
createSchedule(createScheduleVars).then((response) => {
  const data = response.data;
  console.log(data.classSchedule_insert);
});
```

### Using `CreateSchedule`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createScheduleRef, CreateScheduleVariables } from '@oruschools/erp-sdk';

// The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`:
const createScheduleVars: CreateScheduleVariables = {
  schoolId: ..., 
  classroomId: ..., 
  subjectId: ..., 
  teacherId: ..., 
  dayOfWeek: ..., 
  startTime: ..., 
  endTime: ..., 
};

// Call the `createScheduleRef()` function to get a reference to the mutation.
const ref = createScheduleRef(createScheduleVars);
// Variables can be defined inline as well.
const ref = createScheduleRef({ schoolId: ..., classroomId: ..., subjectId: ..., teacherId: ..., dayOfWeek: ..., startTime: ..., endTime: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createScheduleRef(dataConnect, createScheduleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.classSchedule_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.classSchedule_insert);
});
```

## CreateLeaveRequest
You can execute the `CreateLeaveRequest` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createLeaveRequest(vars: CreateLeaveRequestVariables): MutationPromise<CreateLeaveRequestData, CreateLeaveRequestVariables>;

interface CreateLeaveRequestRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLeaveRequestVariables): MutationRef<CreateLeaveRequestData, CreateLeaveRequestVariables>;
}
export const createLeaveRequestRef: CreateLeaveRequestRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createLeaveRequest(dc: DataConnect, vars: CreateLeaveRequestVariables): MutationPromise<CreateLeaveRequestData, CreateLeaveRequestVariables>;

interface CreateLeaveRequestRef {
  ...
  (dc: DataConnect, vars: CreateLeaveRequestVariables): MutationRef<CreateLeaveRequestData, CreateLeaveRequestVariables>;
}
export const createLeaveRequestRef: CreateLeaveRequestRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createLeaveRequestRef:
```typescript
const name = createLeaveRequestRef.operationName;
console.log(name);
```

### Variables
The `CreateLeaveRequest` mutation requires an argument of type `CreateLeaveRequestVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateLeaveRequestVariables {
  schoolId: UUIDString;
  userId: string;
  startDate: DateString;
  endDate: DateString;
  reason?: string | null;
}
```
### Return Type
Recall that executing the `CreateLeaveRequest` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateLeaveRequestData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateLeaveRequestData {
  leaveRequest_insert: LeaveRequest_Key;
}
```
### Using `CreateLeaveRequest`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createLeaveRequest, CreateLeaveRequestVariables } from '@oruschools/erp-sdk';

// The `CreateLeaveRequest` mutation requires an argument of type `CreateLeaveRequestVariables`:
const createLeaveRequestVars: CreateLeaveRequestVariables = {
  schoolId: ..., 
  userId: ..., 
  startDate: ..., 
  endDate: ..., 
  reason: ..., // optional
};

// Call the `createLeaveRequest()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createLeaveRequest(createLeaveRequestVars);
// Variables can be defined inline as well.
const { data } = await createLeaveRequest({ schoolId: ..., userId: ..., startDate: ..., endDate: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createLeaveRequest(dataConnect, createLeaveRequestVars);

console.log(data.leaveRequest_insert);

// Or, you can use the `Promise` API.
createLeaveRequest(createLeaveRequestVars).then((response) => {
  const data = response.data;
  console.log(data.leaveRequest_insert);
});
```

### Using `CreateLeaveRequest`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createLeaveRequestRef, CreateLeaveRequestVariables } from '@oruschools/erp-sdk';

// The `CreateLeaveRequest` mutation requires an argument of type `CreateLeaveRequestVariables`:
const createLeaveRequestVars: CreateLeaveRequestVariables = {
  schoolId: ..., 
  userId: ..., 
  startDate: ..., 
  endDate: ..., 
  reason: ..., // optional
};

// Call the `createLeaveRequestRef()` function to get a reference to the mutation.
const ref = createLeaveRequestRef(createLeaveRequestVars);
// Variables can be defined inline as well.
const ref = createLeaveRequestRef({ schoolId: ..., userId: ..., startDate: ..., endDate: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createLeaveRequestRef(dataConnect, createLeaveRequestVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.leaveRequest_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.leaveRequest_insert);
});
```

## UpdateLeaveRequest
You can execute the `UpdateLeaveRequest` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
updateLeaveRequest(vars: UpdateLeaveRequestVariables): MutationPromise<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;

interface UpdateLeaveRequestRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLeaveRequestVariables): MutationRef<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;
}
export const updateLeaveRequestRef: UpdateLeaveRequestRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateLeaveRequest(dc: DataConnect, vars: UpdateLeaveRequestVariables): MutationPromise<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;

interface UpdateLeaveRequestRef {
  ...
  (dc: DataConnect, vars: UpdateLeaveRequestVariables): MutationRef<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;
}
export const updateLeaveRequestRef: UpdateLeaveRequestRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateLeaveRequestRef:
```typescript
const name = updateLeaveRequestRef.operationName;
console.log(name);
```

### Variables
The `UpdateLeaveRequest` mutation requires an argument of type `UpdateLeaveRequestVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateLeaveRequestVariables {
  schoolId: UUIDString;
  id: UUIDString;
  status: LeaveStatus;
  substituteId?: string | null;
}
```
### Return Type
Recall that executing the `UpdateLeaveRequest` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateLeaveRequestData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateLeaveRequestData {
  leaveRequest_updateMany: number;
}
```
### Using `UpdateLeaveRequest`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateLeaveRequest, UpdateLeaveRequestVariables } from '@oruschools/erp-sdk';

// The `UpdateLeaveRequest` mutation requires an argument of type `UpdateLeaveRequestVariables`:
const updateLeaveRequestVars: UpdateLeaveRequestVariables = {
  schoolId: ..., 
  id: ..., 
  status: ..., 
  substituteId: ..., // optional
};

// Call the `updateLeaveRequest()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateLeaveRequest(updateLeaveRequestVars);
// Variables can be defined inline as well.
const { data } = await updateLeaveRequest({ schoolId: ..., id: ..., status: ..., substituteId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateLeaveRequest(dataConnect, updateLeaveRequestVars);

console.log(data.leaveRequest_updateMany);

// Or, you can use the `Promise` API.
updateLeaveRequest(updateLeaveRequestVars).then((response) => {
  const data = response.data;
  console.log(data.leaveRequest_updateMany);
});
```

### Using `UpdateLeaveRequest`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateLeaveRequestRef, UpdateLeaveRequestVariables } from '@oruschools/erp-sdk';

// The `UpdateLeaveRequest` mutation requires an argument of type `UpdateLeaveRequestVariables`:
const updateLeaveRequestVars: UpdateLeaveRequestVariables = {
  schoolId: ..., 
  id: ..., 
  status: ..., 
  substituteId: ..., // optional
};

// Call the `updateLeaveRequestRef()` function to get a reference to the mutation.
const ref = updateLeaveRequestRef(updateLeaveRequestVars);
// Variables can be defined inline as well.
const ref = updateLeaveRequestRef({ schoolId: ..., id: ..., status: ..., substituteId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateLeaveRequestRef(dataConnect, updateLeaveRequestVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.leaveRequest_updateMany);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.leaveRequest_updateMany);
});
```

## CreateExam
You can execute the `CreateExam` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createExam(vars: CreateExamVariables): MutationPromise<CreateExamData, CreateExamVariables>;

interface CreateExamRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateExamVariables): MutationRef<CreateExamData, CreateExamVariables>;
}
export const createExamRef: CreateExamRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createExam(dc: DataConnect, vars: CreateExamVariables): MutationPromise<CreateExamData, CreateExamVariables>;

interface CreateExamRef {
  ...
  (dc: DataConnect, vars: CreateExamVariables): MutationRef<CreateExamData, CreateExamVariables>;
}
export const createExamRef: CreateExamRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createExamRef:
```typescript
const name = createExamRef.operationName;
console.log(name);
```

### Variables
The `CreateExam` mutation requires an argument of type `CreateExamVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateExamVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  title: string;
  examDate: DateString;
  maxScore: number;
}
```
### Return Type
Recall that executing the `CreateExam` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateExamData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateExamData {
  exam_insert: Exam_Key;
}
```
### Using `CreateExam`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createExam, CreateExamVariables } from '@oruschools/erp-sdk';

// The `CreateExam` mutation requires an argument of type `CreateExamVariables`:
const createExamVars: CreateExamVariables = {
  schoolId: ..., 
  classroomId: ..., 
  subjectId: ..., 
  title: ..., 
  examDate: ..., 
  maxScore: ..., 
};

// Call the `createExam()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createExam(createExamVars);
// Variables can be defined inline as well.
const { data } = await createExam({ schoolId: ..., classroomId: ..., subjectId: ..., title: ..., examDate: ..., maxScore: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createExam(dataConnect, createExamVars);

console.log(data.exam_insert);

// Or, you can use the `Promise` API.
createExam(createExamVars).then((response) => {
  const data = response.data;
  console.log(data.exam_insert);
});
```

### Using `CreateExam`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createExamRef, CreateExamVariables } from '@oruschools/erp-sdk';

// The `CreateExam` mutation requires an argument of type `CreateExamVariables`:
const createExamVars: CreateExamVariables = {
  schoolId: ..., 
  classroomId: ..., 
  subjectId: ..., 
  title: ..., 
  examDate: ..., 
  maxScore: ..., 
};

// Call the `createExamRef()` function to get a reference to the mutation.
const ref = createExamRef(createExamVars);
// Variables can be defined inline as well.
const ref = createExamRef({ schoolId: ..., classroomId: ..., subjectId: ..., title: ..., examDate: ..., maxScore: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createExamRef(dataConnect, createExamVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.exam_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.exam_insert);
});
```

## CreateAuditLog
You can execute the `CreateAuditLog` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
createAuditLog(vars: CreateAuditLogVariables): MutationPromise<CreateAuditLogData, CreateAuditLogVariables>;

interface CreateAuditLogRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAuditLogVariables): MutationRef<CreateAuditLogData, CreateAuditLogVariables>;
}
export const createAuditLogRef: CreateAuditLogRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAuditLog(dc: DataConnect, vars: CreateAuditLogVariables): MutationPromise<CreateAuditLogData, CreateAuditLogVariables>;

interface CreateAuditLogRef {
  ...
  (dc: DataConnect, vars: CreateAuditLogVariables): MutationRef<CreateAuditLogData, CreateAuditLogVariables>;
}
export const createAuditLogRef: CreateAuditLogRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAuditLogRef:
```typescript
const name = createAuditLogRef.operationName;
console.log(name);
```

### Variables
The `CreateAuditLog` mutation requires an argument of type `CreateAuditLogVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAuditLogVariables {
  schoolId?: UUIDString | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown | null;
}
```
### Return Type
Recall that executing the `CreateAuditLog` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAuditLogData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAuditLogData {
  auditLog_insert: AuditLog_Key;
}
```
### Using `CreateAuditLog`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAuditLog, CreateAuditLogVariables } from '@oruschools/erp-sdk';

// The `CreateAuditLog` mutation requires an argument of type `CreateAuditLogVariables`:
const createAuditLogVars: CreateAuditLogVariables = {
  schoolId: ..., // optional
  actorId: ..., 
  action: ..., 
  entityType: ..., 
  entityId: ..., // optional
  details: ..., // optional
};

// Call the `createAuditLog()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAuditLog(createAuditLogVars);
// Variables can be defined inline as well.
const { data } = await createAuditLog({ schoolId: ..., actorId: ..., action: ..., entityType: ..., entityId: ..., details: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAuditLog(dataConnect, createAuditLogVars);

console.log(data.auditLog_insert);

// Or, you can use the `Promise` API.
createAuditLog(createAuditLogVars).then((response) => {
  const data = response.data;
  console.log(data.auditLog_insert);
});
```

### Using `CreateAuditLog`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAuditLogRef, CreateAuditLogVariables } from '@oruschools/erp-sdk';

// The `CreateAuditLog` mutation requires an argument of type `CreateAuditLogVariables`:
const createAuditLogVars: CreateAuditLogVariables = {
  schoolId: ..., // optional
  actorId: ..., 
  action: ..., 
  entityType: ..., 
  entityId: ..., // optional
  details: ..., // optional
};

// Call the `createAuditLogRef()` function to get a reference to the mutation.
const ref = createAuditLogRef(createAuditLogVars);
// Variables can be defined inline as well.
const ref = createAuditLogRef({ schoolId: ..., actorId: ..., action: ..., entityType: ..., entityId: ..., details: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAuditLogRef(dataConnect, createAuditLogVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.auditLog_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.auditLog_insert);
});
```

