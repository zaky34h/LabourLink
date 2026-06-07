import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { router, useFocusEffect } from "expo-router";
import { getUsers, type LabourerUser } from "../../src/auth/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";

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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.lg, flexGrow: 1 }}
        data={pagedResults}
        keyExtractor={(x) => x.email}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <Text style={type.h1}>Browse</Text>

            <View style={styles.searchCard}>
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Pressable onPress={() => setCalendarOpen(true)} style={styles.field}>
                  <Text style={{ fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text }}>
                    {formatNiceDate(selectedDate)}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>📅</Text>
                </Pressable>
              </View>

              <Pressable onPress={onSearch} style={styles.searchBtn}>
                <Text style={styles.searchBtnLabel}>Search</Text>
              </Pressable>
            </View>

            <Text style={{ ...type.secondary, marginTop: spacing.md, marginBottom: spacing.sm, fontWeight: fontWeight.bold }}>
              Showing {Math.min(pagedResults.length, filteredResults.length)} of {filteredResults.length}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ ...type.secondary, marginTop: spacing.xl }}>
            No labourers available for that date.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, minWidth: 0, paddingRight: spacing.sm }}>
                <View style={styles.avatar}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>
                      {(item.firstName?.[0] ?? "L").toUpperCase()}
                      {(item.lastName?.[0] ?? "").toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.cardTitle, { flexShrink: 1 }]} numberOfLines={1}>
                  {item.firstName} {item.lastName}
                </Text>
              </View>
              <View style={styles.ratePill}>
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.label, color: colors.primary }}>
                  ${item.pricePerHour}/hr
                </Text>
              </View>
            </View>

            <Text style={{ ...type.secondary, marginTop: spacing.sm }} numberOfLines={2}>
              {item.about}
            </Text>

            <Text style={{ ...type.secondary, marginTop: spacing.sm, fontWeight: fontWeight.bold }}>
              Unavailable dates set: {(item.unavailableDates ?? []).length}
            </Text>

            <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => router.push(`/builder/labourer/${encodeURIComponent(item.email)}`)}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnLabel}>View</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(`/chat/${encodeURIComponent(item.email)}`)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.secondaryBtnLabel}>Message</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Calendar modal */}
      <Modal visible={calendarOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Text style={type.h2}>Pick a date</Text>
              <Pressable onPress={() => setCalendarOpen(false)}>
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>Done</Text>
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

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  searchCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  fieldLabel: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  field: {
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.field,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchBtn: {
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  searchBtnLabel: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.onPrimary },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: { fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.field,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ratePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.successBg,
  },
  primaryBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnLabel: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.onPrimary },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.field,
  },
  secondaryBtnLabel: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
});

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
