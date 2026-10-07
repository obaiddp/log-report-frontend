import EntityManager from "./EntityManager";
import {
  createItem,
  deleteItem,
  getItems,
  updateItem,
  type Item,
} from "@/lib/api";

export default function ItemManager() {
  return (
    <EntityManager<Item>
      title="Item types"
      description="Assets and equipment that can break."
      createLabel="Add item type"
      fields={[{ key: "name", label: "Name", placeholder: "Item name" }]}
      fetchAll={getItems}
      create={(values) => createItem(values.name ?? "")}
      update={updateItem}
      remove={deleteItem}
    />
  );
}
