import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { router } from "expo-router";
import { getUsers, type LabourerUser } from "../../src/auth/storage";

const PAGE_SIZE = 10;

export default function BuilderBrowse() {
  const [loading, setLoading] = useState(true);

  const [allLabourers, setAllLabourers] = useState<LabourerUser[]>([]);
  const [results, setResults] = useState<LabourerUser[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [selectedType, setSelectedType] = useState<string>("All");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const users = await getUsers();
    const labourers = users.filter((u) => u.role === "labourer") as LabourerUser[];
    setAllLabourers(labourers);
    setResults(labourers);
    setPage(1);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const typeOptions = useMemo(() => {
    const types = Array.from(
      new Set(allLabourers.map((l) => (l.occupation ?? "").trim()))
    ).filter(Boolean);
    types.sort((a, b) => a.localeCompare(b));
    return ["All", ...types];
  }, [allLabourers]);

  function onSearch() {
    let filtered = [...allLabourers];

    if (selectedType !== "All") {
      filtered = filtered.filter(
        (l) => l.occupation.toLowerCase() === selectedType.toLowerCase()
      );
    }

    filtered = filtered.filter((l) =>
      (l.availableDates ?? []).includes(selectedDate)
    );

    setResults(filtered);
    setPage(1);
  }

  const pagedResults = useMemo(
    () => results.slice(0, page * PAGE_SIZE),
    [results, page]
  );

  function loadMore() {
    if (pagedResults.length >= results.length) return;
    setPage((p) => p + 1);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 60, backgroundColor: "#F6F7FB" }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Browse Labourers</Text>

      {/* Filters card */}
      <View
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 16,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#E9E9EE",
          gap: 12,
        }}
      >
        {/* Date */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "800" }}>Date</Text>
          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={fieldStyle}
          >
            <Text style={{ fontWeight: "700" }}>{formatNiceDate(selectedDate)}</Text>
            <Text style={{ opacity: 0.7 }}>📅</Text>
          </Pressable>
        </View>

        {/* Type (pressable field + modal) */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "800" }}>Type</Text>
          <Pressable
            onPress={() => setTypeOpen(true)}
            style={fieldStyle}
          >
            <Text style={{ fontWeight: "700" }}>{selectedType}</Text>
            <Text style={{ opacity: 0.7 }}>▾</Text>
          </Pressable>
        </View>

        {/* Search */}
        <Pressable
          onPress={onSearch}
          style={{
            padding: 14,
            borderRadius: 14,
            backgroundColor: "#111",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>Search</Text>
        </Pressable>
      </View>

      <Text style={{ marginTop: 14, opacity: 0.7, fontWeight: "700" }}>
        Showing {Math.min(pagedResults.length, results.length)} of {results.length}
      </Text>

      <FlatList
        style={{ marginTop: 10 }}
        data={pagedResults}
        keyExtractor={(x) => x.email}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <Text style={{ marginTop: 26, opacity: 0.7 }}>
            No labourers available for that date/type.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#E9E9EE",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900" }}>
                {item.firstName} {item.lastName}
              </Text>
              <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#F2F3F8" }}>
                <Text style={{ fontWeight: "800" }}>${item.pricePerHour}/hr</Text>
              </View>
            </View>

            <Text style={{ marginTop: 6, fontWeight: "800", opacity: 0.85 }}>
              {item.occupation}
            </Text>

            <Text style={{ marginTop: 8, opacity: 0.75 }} numberOfLines={2}>
              {item.about}
            </Text>

            <Text style={{ marginTop: 10, opacity: 0.7, fontWeight: "700" }}>
              Available dates: {(item.availableDates ?? []).length}
            </Text>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => router.push(`/builder/labourer/${encodeURIComponent(item.email)}`)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "#111",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>View</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(`/chat/${encodeURIComponent(item.email)}`)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E6E6EA",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "#F2F3F8" : "#fff",
                })}
              >
                <Text style={{ fontWeight: "900" }}>Message</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Calendar modal */}
      <Modal visible={calendarOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Pick a date</Text>
              <Pressable onPress={() => setCalendarOpen(false)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{ [selectedDate]: { selected: true } }}
            />
          </View>
        </View>
      </Modal>

      {/* Type modal */}
      <Modal visible={typeOpen} animationType="fade" transparent>
        <Pressable
          onPress={() => setTypeOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Select type</Text>
              <Pressable onPress={() => setTypeOpen(false)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              {typeOptions.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setSelectedType(t);
                    setTypeOpen(false);
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selectedType === t ? "#111" : "#E9E9EE",
                    backgroundColor: selectedType === t ? "#111" : "#fff",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: selectedType === t ? "#fff" : "#111" }}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const fieldStyle = {
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#E6E6EA",
  backgroundColor: "#FAFAFC",
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatNiceDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}