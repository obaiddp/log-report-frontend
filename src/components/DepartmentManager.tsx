import EntityManager from "./EntityManager";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
  type Department,
} from "@/lib/api";

export default function DepartmentManager() {
  return (
    <EntityManager<Department>
      title="Departments"
      description="Manage the departments that can raise support requests."
      createLabel="Add department"
      fields={[
        { key: "name", label: "Name", placeholder: "Department name" },
        { key: "code", label: "Code", placeholder: "Code (e.g. HR)" },
      ]}
      fetchAll={getDepartments}
      create={(values) => createDepartment(values.name ?? "", values.code ?? "")}
      update={updateDepartment}
      remove={deleteDepartment}
      extraHeader="Code"
      extraCell={(d) => d.code}
    />
  );
}
