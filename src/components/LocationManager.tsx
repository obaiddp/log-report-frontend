
import EntityManager from "./EntityManager";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
  type Location,
} from "@/lib/api";

export default function LocationManager() {
  return (
    <EntityManager<Location>
      title="Locations"
      createLabel="Add location"
      fields={[
        {
          key: "name",
          label: "Name",
          placeholder: "Location name",
        },
      ]}
      fetchAll={getLocations}
      create={(values) => createLocation(values.name ?? "")}
      update={(id, name) => updateLocation(id, name)}
      remove={deleteLocation}
      extraHeader="In Use"
      extraCell={(location) => (
        <span
          className={
            location.in_use
              ? "text-green-600"
              : "text-muted-foreground"
          }
        >
          {location.in_use ? "Yes" : "No"}
        </span>
      )}
    />
  );
}

/*
id  | ticket_number  | issue_date |  initiated_by  | department_id | item_type_id |      status       |                        issue_details                         | assigned_to | created_by |     created_at      |     updated_at      | resolved_at | closed_at 
-----+----------------+------------+----------------+---------------+--------------+-------------------+--------------------------------------------------------------+-------------+------------+---------------------+---------------------+-------------+-----------
 185 | SL-2026-000185 | 2026-04-08 | CEO Sir        |             4 |            2 | outdoor_repairing | Power issue                                                  |           2 |          2 | 2026-04-08 09:00:00 | 2026-04-08 09:00:00 |             | 
 353 | SL-2026-000353 | 2026-10-26 | aslam          |             3 |            5 | outdoor_repairing |                                                              |           4 |          1 | 2026-10-26 09:42:10 | 2026-10-26 09:42:10 |             | 
 186 | SL-2026-000186 | 2026-04-13 | Mubarik aslam  |             1 |            1 | resolved          | inspection report                                            |           2 |          2 | 2026-04-13 09:00:00 | 2026-04-13 09:00:00 |             | 
 187 | SL-2026-000187 | 2026-04-13 | Mubarik aslam  |             1 |            1 | resolved          | inspection report                                            |           2 |          2 | 2026-04-13 09:00:00 | 2026-04-13 09:00:00 |             | 
 188 | SL-2026-000188 | 2026-04-13 | CEO Sir        |             4 |            2 | resolved          | Tested                                                       |           2 |          2 | 2026-04-13 09:00:00 | 2026-04-13 09:00:00 |             | 
 189 | SL-2026-000189 | 2026-04-14 | CEO Sir        |             4 |            5 | resolved          | connectivity issue                                           |           2 |          2 | 2026-04-14 09:00:00 | 2026-04-14 09:00:00 |             | 
 190 | SL-2026-000190 | 2026-04-14 | Mubarik aslam  |             1 |            1 | resolved          | inspection and report generation                             |           2 |          2 | 2026-04-14 09:00:00 | 2026-04-14 09:00:00 |             | 
 361 | SL-2026-000361 | 2026-10-28 | aslam          |             7 |            5 | outdoor_repairing 

*/