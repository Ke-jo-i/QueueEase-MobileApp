import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const registrarServices = [
    'Certificate of Enrollment',
    'Certificate of Grades',
    'Academic Records Request',
    'Enrollment Concern',
    'Student Record Update',
    'Other Registrar Concern',
  ];

  const handleSelectService = (serviceName: string) => {
    router.push({
      pathname: '/confirm-service',
      params: { serviceName },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>QueueEase</Text>
          <TouchableOpacity style={styles.profileIconBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color="#003366" />
          </TouchableOpacity>
        </View>

        {/* Greeting & Active Queue Banner */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Good day!</Text>

          <View style={styles.queueBanner}>
            <Text style={styles.queueBannerLabel}>Current Queue</Text>
            <Text style={styles.queueBannerTitle}>No Active Queue</Text>
            <Text style={styles.queueBannerSub}>You don't have an active queue right now</Text>
          </View>
        </View>

        {/* All Registrar Services List with Hover Effect */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Registrar Services</Text>

          {registrarServices.map((service, index) => (
            <Pressable
              key={index}
              onPress={() => handleSelectService(service)}
              style={({ hovered, pressed }) => [
                styles.serviceCard,
                hovered && styles.serviceCardHovered, // Kulay kapag itinaas lang ang mouse cursor
                pressed && styles.serviceCardPressed, // Kulay kapag talagang pino-press/kiniclick
              ]}
            >
              {({ hovered }) => (
                <Text
                  style={[
                    styles.serviceName,
                    hovered && styles.serviceNameHovered,
                  ]}
                >
                  {service}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003366',
  },
  profileIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  queueBanner: {
    backgroundColor: '#F0F5FF',
    borderRadius: 16,
    padding: 20,
  },
  queueBannerLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  queueBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 4,
  },
  queueBannerSub: {
    fontSize: 13,
    color: '#64748B',
  },
  servicesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },

  // Default Box Style
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'center',
    cursor: 'pointer', 
  },

  
  serviceCardHovered: {
    backgroundColor: '#F0F7FF', 
    borderColor: '#003366',    
  },

  
  serviceCardPressed: {
    backgroundColor: '#E0EDFF',
  },

  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },

  serviceNameHovered: {
    color: '#003366',
    fontWeight: 'bold',
  },
});