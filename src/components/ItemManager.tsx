import EntityManager from "./EntityManager";
import {
  createItem,
  deleteItem,
  getItems,
  updateItem,
  updateItemHasSpecification,
  type Item,
} from "@/lib/api";

export default function ItemManager() {
  return (
    <EntityManager<Item>
      title="Item types"
      description="Assets and equipment that can break."
      createLabel="Add item type"
      fields={[
        {
          key: "name",
          label: "Name",
          placeholder: "Item name",
        },
      ]}
      fetchAll={getItems}
      create={(values) => createItem(values.name ?? "", false)}
      update={updateItem}
      remove={deleteItem}
      booleanField={{
        key: "has_specification",
        label: "Has specifications",
        update: updateItemHasSpecification,
      }}
    />
  );
}