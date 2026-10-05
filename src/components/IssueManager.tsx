import EntityManager from "./EntityManager";
import {
  createIssue,
  deleteIssue,
  getIssues,
  updateIssue,
  type Issue,
} from "@/lib/api";

export default function IssueManager() {
  return (
    <EntityManager<Issue>
      title="Issue types"
      description="Categories used when classifying a support log."
      createLabel="Add issue type"
      fields={[{ key: "name", label: "Name", placeholder: "Issue name" }]}
      fetchAll={getIssues}
      create={(values) => createIssue(values.name ?? "")}
      update={updateIssue}
      remove={deleteIssue}
    />
  );
}
