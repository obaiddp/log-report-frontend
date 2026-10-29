import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  enablePush,
  getExistingSubscription,
  pushSupported,
} from "@/lib/push";
import {
  savePushSubscription,
  removePushSubscription,
} from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();

  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function checkPushStatus() {
      try {
        const isSupported = pushSupported();
        if (!active) return;
        setSupported(isSupported);

        if (isSupported) {
          const subscription = await getExistingSubscription();

          if (subscription && Notification.permission === "granted") {
            // Re-associate this browser's subscription with the current user
            await savePushSubscription(subscription);
            if (active) setEnabled(true);
          } else if (active) {
            setEnabled(false);
          }
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not check notification status."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void checkPushStatus();
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleEnable() {
    setSaving(true);
    setMessage("");

    try {
      const subscription = await enablePush();
      await savePushSubscription(subscription);

      setEnabled(true);
      setMessage("Browser notifications enabled successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable browser notifications."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    setSaving(true);
    setMessage("");

    try {
      const subscription = await getExistingSubscription();

      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setEnabled(false);
      setMessage("Browser notifications disabled.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not disable browser notifications."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const items = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Designation", value: user.designation || "—" },
    { label: "Role", value: user.role?.name || "—" },
    {
      label: "Email Verified",
      value: user.email_verified_at ? "Yes" : "No",
    },
  ];

  return (
    <div id="profile-page" className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your account details and permissions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            id={`profile-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className="rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Browser Notifications
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive CEF365 alerts about asset inspections in your browser.
        </p>

        <p className="mt-3 text-sm text-foreground">
          Status:{" "}
          {!supported
            ? "Not supported in this browser"
            : loading
              ? "Checking..."
              : enabled
                ? "Enabled"
                : "Not enabled"}
        </p>

        {supported && !loading && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void (enabled ? handleDisable() : handleEnable());
            }}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving
              ? "Please wait..."
              : enabled
                ? "Disable browser notifications"
                : "Enable browser notifications"}
          </button>
        )}

        {message && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </section>

      {user.role?.permissions && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.role.permissions.map((permission) => (
              <span
                key={permission.id}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
              >
                {permission.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ????????????????????????????????????????????????????????????????????????????????????


// import { useAuth } from "@/context/AuthContext";

// export default function ProfilePage() {
//   const { user } = useAuth();

//   if (!user) {
//     return null;
//   }

//   const items = [
//     { label: "Name", value: user.name },
//     { label: "Email", value: user.email },
//     { label: "Designation", value: user.designation || "—" },
//     { label: "Role", value: user.role?.name || "—" },
//     {
//       label: "Email Verified",
//       value: user.email_verified_at ? "Yes" : "No",
//     },
//   ];

//   return (
//     <div id="profile-page" className="max-w-3xl space-y-6">
//       <div>
//         <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
//         <p className="text-sm text-muted-foreground">
//           Your account details and permissions.
//         </p>
//       </div>

//       <div className="grid gap-3 sm:grid-cols-2">
//         {items.map((item) => (
//           <div
//             key={item.label}
//             id={`profile-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
//             className="rounded-lg border border-border bg-card p-4"
//           >
//             <p className="text-xs text-muted-foreground">{item.label}</p>
//             <p className="mt-1 text-sm font-medium text-foreground">
//               {item.value}
//             </p>
//           </div>
//         ))}
//       </div>

//       {user.role?.permissions && (
//         <section className="rounded-lg border border-border bg-card p-4">
//           <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
//           <div className="mt-3 flex flex-wrap gap-1.5">
//             {user.role.permissions.map((permission) => (
//               <span
//                 key={permission.id}
//                 className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
//               >
//                 {permission.name}
//               </span>
//             ))}
//           </div>
//         </section>
//       )}
//     </div>
//   );
// }

// =================================================================================
// =================================================================================
// =================================================================================