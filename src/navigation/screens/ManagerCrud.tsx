import { useEffect, useState } from "react";
import { View, Text, Button, TextInput, ScrollView, Alert } from "react-native";
import { supabase } from "../../lib/supabase-client";
import { Session } from "@supabase/supabase-js";

interface ManagerCrudProps {
  session: Session;
  logout: () => Promise<void>;
}

interface Task {
  id: number;
  title: string;
  description: string;
  email: string | null;
}

const ManagerCrud: React.FC<ManagerCrudProps> = ({ session, logout }) => {
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [tasks, setTasks] = useState<Task[]>([]);
  // Per-task editing state (avoids shared input issues across tasks)
  const [editingTasks, setEditingTasks] = useState<{
    [key: number]: { title: string; description: string };
  }>({});
  const [taskImage, setTaskImage] = useState<string | null>(null);

  // Insert a task
  const handleSubmit = async () => {
    if (!newTask.title.trim() || !newTask.description.trim()) {
      Alert.alert("Error", "Title and description are required.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .insert({ ...newTask, email: session.user.email })
      .select()
      .single();

    if (error) {
      console.error("Error inserting data:", error);
      Alert.alert("Error", `Failed to add task: ${error.message}`);
      return;
    }

    console.log("Data inserted successfully!");
    setNewTask({ title: "", description: "" });
    fetchTasks(); // Refetch to update UI
  };

  // Fetch only the current user's tasks (prevents loading duplicates from other users)
  const fetchTasks = async () => {
    const { error, data } = await supabase
      .from("tasks")
      .select("*")
      .eq("email", session.user.email) // Key fix: Filter by user email
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load tasks.");
      setTasks([]);
      return;
    }

    console.log("Data fetched successfully!");
    // Safeguard: Deduplicate by ID (removes any accidental duplicates)
    const uniqueTasks =
      data?.filter(
        (task, index, self) => index === self.findIndex((t) => t.id === task.id)
      ) ?? [];
    setTasks(uniqueTasks);
  };

  // Delete a task
  const deleteTask = async (id: number) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("email", session.user.email); // Security: Only delete own tasks

    if (error) {
      console.error("Error deleting data:", error);
      Alert.alert("Error", "Failed to delete task.");
      return;
    }

    console.log("Data deleted successfully!");
    fetchTasks(); // Refetch to update UI immediately
  };

  // Update a task
  const updateTask = async (id: number) => {
    const edits = editingTasks[id];
    if (!edits || (!edits.title.trim() && !edits.description.trim())) {
      Alert.alert("Error", "Provide at least one change.");
      return;
    }

    // Build payload only for changed fields
    const updatePayload: any = {};
    const originalTask = tasks.find((t) => t.id === id);
    if (edits.title.trim() && edits.title.trim() !== originalTask?.title) {
      updatePayload.title = edits.title;
    }
    if (
      edits.description.trim() &&
      edits.description.trim() !== originalTask?.description
    ) {
      updatePayload.description = edits.description;
    }

    if (Object.keys(updatePayload).length === 0) {
      Alert.alert("Info", "No changes to save.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .eq("email", session.user.email); // Security filter

    if (error) {
      console.error("Error updating data:", error);
      Alert.alert("Error", "Failed to update task.");
      return;
    }

    console.log("Data updated successfully!");
    // Clear editing state for this task
    setEditingTasks((prev) => {
      const newEdits = { ...prev };
      delete newEdits[id];
      return newEdits;
    });
    fetchTasks(); // Refetch to update UI
  };

  const handleFileChange = (newImage: string | null) => {
    setTaskImage(newImage);
    console.log("Selected image URL:", newImage);
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Real-time subscription for user's tasks only
  useEffect(() => {
    const channel = supabase.channel("tasks-channel");
    channel
      .on(
        "postgres_changes",
        {
          event: "*", // All events: INSERT, UPDATE, DELETE
          schema: "public",
          table: "tasks",
          filter: `email=eq.${session.user.email}`, // Only user's tasks
        },
        (payload) => {
          console.log("Real-time change:", payload);
          // Key fix: Refetch instead of appending (prevents duplicates)
          fetchTasks();
        }
      )
      .subscribe((status) => {
        console.log("Subscribed to tasks changes:", status);
      });

    // Cleanup on unmount
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.user.email]);

  console.log(
    "Current tasks (length:",
    tasks.length,
    ") IDs:",
    tasks.map((t) => t.id)
  ); // Debug: Check for duplicates

  return (
    <ScrollView style={{ flex: 1 }}>
      <View
        style={{
          padding: 20,
          alignItems: "center",
          borderColor: "black",
          borderWidth: 1,
          margin: 30,
        }}
      >
        <Text>Task Manager CRUD</Text>

        {/* Add Task Form */}
        <TextInput
          placeholder="Task Title"
          value={newTask.title} // Key fix: Controlled input
          onChangeText={(text) =>
            setNewTask((prev) => ({ ...prev, title: text }))
          }
          style={{ borderWidth: 1, padding: 10, margin: 10, width: "100%" }}
        />
        <TextInput
          placeholder="Task Description"
          value={newTask.description} // Key fix: Controlled input
          onChangeText={(text) =>
            setNewTask((prev) => ({ ...prev, description: text }))
          }
          style={{ borderWidth: 1, padding: 10, margin: 10, width: "100%" }}
        />

        <Button title="Add Task" onPress={handleSubmit} />
        <Button title="Logout" onPress={logout} />

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <Text>No tasks yet. Add one above!</Text>
        ) : (
          tasks.map((task) => {
            // Per-task editing state
            const currentEdits = editingTasks[task.id] || {
              title: task.title,
              description: task.description,
            };

            return (
              <View
                key={task.id.toString()} // Stringify for extra uniqueness safeguard
                style={{
                  marginTop: 20,
                  marginBottom: 10,
                  width: "100%",
                  borderWidth: 1,
                  padding: 10,
                }}
              >
                <Text style={{ fontWeight: "bold" }}>Title: {task.title}</Text>
                <Text>Description: {task.description}</Text>
                <Text>Email: {task.email || "N/A"}</Text>

                {/* Per-Task Edit Inputs (independent for each task) */}
                <TextInput
                  placeholder="Edit Title"
                  value={currentEdits.title}
                  onChangeText={(text) =>
                    setEditingTasks((prev) => ({
                      ...prev,
                      [task.id]: { ...currentEdits, title: text },
                    }))
                  }
                  style={{
                    borderWidth: 1,
                    padding: 10,
                    margin: 5,
                    width: "100%",
                  }}
                />
                <TextInput
                  placeholder="Edit Description"
                  value={currentEdits.description}
                  onChangeText={(text) =>
                    setEditingTasks((prev) => ({
                      ...prev,
                      [task.id]: { ...currentEdits, description: text },
                    }))
                  }
                  style={{
                    borderWidth: 1,
                    padding: 10,
                    margin: 5,
                    width: "100%",
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
                  <Button
                    title="Delete Task"
                    onPress={() => deleteTask(task.id)}
                    color="#ff4444"
                  />
                  <Button
                    title="Update Task"
                    onPress={() => updateTask(task.id)}
                    color="#4CAF50"
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default ManagerCrud;
