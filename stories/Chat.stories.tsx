import React from "react";
import { Chat } from "../src/components/Chat";

export default {
  title: "Chat/Basic",
  component: Chat,
};

export const Basic = () => (
  <div style={{ padding: "2rem", background: "#f3f4f6", minHeight: "100vh" }}>
    <Chat />
  </div>
);