import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { router, useFocusEffect } from "expo-router";
import { getUsers, type LabourerUser } from "../../src/auth/storage";

const PAGE_SIZE = 10;

export default function BuilderBrowse() {
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [allLabourers, setAllLabourers] = useState<LabourerUser[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [page, setPage] = useState(1);

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const users = await getUsers();
    const labourers = users.filter((u) => u.role === "labourer") as LabourerUser[];
    setAllLabourers(labourers);
    setPage(1);
    if (!silent) setLoading(false);
    loadedRef.current = true;
  }

  async function onRefresh() {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loadedRef.current) return;
      void load({ silent: true });
    }, [])
  );

  useEffect(() => {
    setPage(1);
  }, [selectedDate, allLabourers]);

  const filteredResults = useMemo(() => {
    return allLabourers.filter((l) => !(l.unavailableDates ?? []).includes(selectedDate));
  }, [allLabourers, selectedDate]);

  function onSearch() {
    setPage(1);
  }

  const pagedResults = useMemo(
    () => filteredResults.slice(0, page * PAGE_SIZE),
    [filteredResults, page]
  );

  function loadMore() {
    if (pagedResults.length >= filteredResults.length) return;
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
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, flexGrow: 1 }}
        data={pagedResults}
        keyExtractor={(x) => x.email}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>Browse</Text>

            <View
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 16,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#111111",
                gap: 12,
              }}
            >
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
                <Text style={{ color: "#FDE047", fontWeight: "900" }}>Search</Text>
              </Pressable>
            </View>

            <Text style={{ marginTop: 14, marginBottom: 10, opacity: 0.7, fontWeight: "700" }}>
              Showing {Math.min(pagedResults.length, filteredResults.length)} of {filteredResults.length}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ marginTop: 26, opacity: 0.7 }}>
            No labourers available for that date.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#111111",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900" }}>
                {item.firstName} {item.lastName}
              </Text>
              <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#FDE047" }}>
                <Text style={{ fontWeight: "800" }}>${item.pricePerHour}/hr</Text>
              </View>
            </View>

            <Text style={{ marginTop: 8, opacity: 0.75 }} numberOfLines={2}>
              {item.about}
            </Text>

            <Text style={{ marginTop: 10, opacity: 0.7, fontWeight: "700" }}>
              Unavailable dates set: {(item.unavailableDates ?? []).length}
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
                <Text style={{ color: "#FDE047", fontWeight: "900" }}>View</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(`/chat/${encodeURIComponent(item.email)}`)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#111111",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "#FDE047" : "#FEF08A",
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

    </View>
  );
}

const fieldStyle = {
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#111111",
  backgroundColor: "#fff",
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
