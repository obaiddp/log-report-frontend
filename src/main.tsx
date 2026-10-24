import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

/*
 id |       name        |           email            |  email_verified_at  |                           password                           | role_id |     designation      |     created_at      |     updated_at      
----+-------------------+----------------------------+---------------------+--------------------------------------------------------------+---------+----------------------+---------------------+---------------------
  1 | Mudassir Shahid   | mudassir.shahid@cef.org.pk | 2026-10-07 11:39:44 | $2y$12$zQ6NjgxvDlf8sRn1skFo6uyM5Em8yiNJKfSPmznf/9KuLHHlmim5O |       1 | Senior Administrator | 2026-10-07 11:39:44 | 2026-10-07 11:39:44
  2 | Muhammad Afaq     | afaq@cef.org.pk            | 2026-10-07 11:39:44 | $2y$12$Rekq4nQQp17iRPN6NkdO1eBKo8U/Li3Z3/.W/fZ0TvEkXc029ggVS |       2 | Junior Administrator | 2026-10-07 11:39:44 | 2026-10-07 11:39:44
  3 | Haris Niaz Abbasi | haris.niaz@cef.org.pk      | 2026-10-07 11:39:45 | $2y$12$sO0Hoas4FTrU.MpFJi8OneRKE/zjChePdWOm5UrTbxhqxWWkUAbL2 |       3 | Junior Administrator | 2026-10-07 11:39:45 | 2026-10-07 11:39:45
  4 | Zulfiqar Ahmed    | zulfiqar.ahmed@cef.org.pk  | 2026-10-07 11:39:45 | $2y$12$.uPl4Y79fq0.3OrTKwwAION4qYTHyIMIwbF5n1rtEyJp9zLqlJf3q |       3 | Senior Developer     | 2026-10-07 11:39:45 | 2026-10-07 11:39:45
  5 | Obaid Ullah Zeb   | obaid.ullah@cef.org.pk     | 2026-10-07 11:39:45 | $2y$12$0w/TeJBwRQSHnfh/SXMCR.X/4cTCB9Qjf5db6N4NYDfXj1iX75o3m |       3 | Assistant Developer  | 2026-10-07 11:39:45 | 2026-10-07 11:39:45
(5 rows)

-------

"Asset inspection form"
As this form mentions admin people and signature so ill keep that as free text in here and make this single form as downloadle as pdf
later when i get instructions to make it dynamic ill make it dynamic and add the signature field as well and add a role for admin people to sign it and make it dynamic as well. For now ill keep it as free text and make it downloadable as pdf.
*/