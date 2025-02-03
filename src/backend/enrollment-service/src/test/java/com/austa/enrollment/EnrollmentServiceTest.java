package com.austa.enrollment;

import com.austa.enrollment.services.EnrollmentService;
import com.austa.enrollment.models.Enrollment;
import com.austa.enrollment.models.EnrollmentStatus;
import com.austa.enrollment.repositories.EnrollmentRepository;
import com.austa.enrollment.dto.EnrollmentDTO;
import com.austa.enrollment.dto.HealthAssessmentDTO;
import com.austa.enrollment.exceptions.EnrollmentException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.util.StopWatch;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.*;
import static org.awaitility.Awaitility.await;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@SpringBootTest
@ExtendWith(SpringExtension.class)
public class EnrollmentServiceTest {

    @MockBean
    private EnrollmentRepository enrollmentRepository;

    @MockBean
    private RestTemplate restTemplate;

    private EnrollmentService enrollmentService;
    private StopWatch stopWatch;

    private static final int SAMPLE_SIZE = 100;
    private static final long SLA_TARGET_MILLIS = 600000; // 10 minutes
    private static final double ACCURACY_TARGET = 0.999; // 99.9%

    @BeforeEach
    void setUp() {
        stopWatch = new StopWatch();
        
        // Initialize test data
        when(enrollmentRepository.save(any(Enrollment.class)))
            .thenAnswer(invocation -> {
                Enrollment e = invocation.getArgument(0);
                e.updateStatus(EnrollmentStatus.DRAFT);
                return e;
            });
    }

    @Test
    void testCreateEnrollmentPerformance() {
        // Prepare test data
        List<EnrollmentDTO> testEnrollments = new ArrayList<>();
        List<Long> processingTimes = new ArrayList<>();

        for (int i = 0; i < SAMPLE_SIZE; i++) {
            testEnrollments.add(createTestEnrollmentDTO());
        }

        // Execute and measure performance
        testEnrollments.forEach(dto -> {
            stopWatch.start();
            
            Enrollment enrollment = enrollmentService.createEnrollment(dto);
            
            stopWatch.stop();
            processingTimes.add(stopWatch.getLastTaskTimeMillis());
            
            assertThat(enrollment).isNotNull();
            assertThat(enrollment.getId()).isNotNull();
        });

        // Verify SLA compliance (90% under 10 minutes)
        long compliantCount = processingTimes.stream()
            .filter(time -> time <= SLA_TARGET_MILLIS)
            .count();
        
        double complianceRate = (double) compliantCount / SAMPLE_SIZE;
        assertThat(complianceRate).isGreaterThanOrEqualTo(0.90);
    }

    @Test
    void testSubmitEnrollmentDataAccuracy() {
        // Prepare test data with known values
        EnrollmentDTO testDTO = createTestEnrollmentDTO();
        UUID beneficiaryId = UUID.randomUUID();
        testDTO.setBeneficiaryId(beneficiaryId);

        // Configure mock behavior
        when(enrollmentRepository.findByIdAndAuthorized(any(), any()))
            .thenReturn(Optional.of(new Enrollment()));

        // Execute enrollment submission
        stopWatch.start();
        Enrollment enrollment = enrollmentService.createEnrollment(testDTO);
        stopWatch.stop();

        // Verify data accuracy
        assertThat(enrollment.getBeneficiaryId()).isEqualTo(beneficiaryId);
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.DRAFT);
        assertThat(enrollment.getCreatedAt()).isCloseTo(
            LocalDateTime.now(), 
            within(1, ChronoUnit.SECONDS)
        );
    }

    @Test
    void testHealthAssessmentIntegration() {
        // Prepare test data
        UUID enrollmentId = UUID.randomUUID();
        HealthAssessmentDTO assessmentDTO = createTestHealthAssessmentDTO();
        Enrollment mockEnrollment = new Enrollment();
        mockEnrollment.setId(enrollmentId);

        when(enrollmentRepository.findById(enrollmentId))
            .thenReturn(Optional.of(mockEnrollment));

        // Test successful processing
        enrollmentService.processHealthAssessment(enrollmentId, assessmentDTO);

        verify(enrollmentRepository, times(1)).save(any(Enrollment.class));
        assertThat(mockEnrollment.getStatus()).isEqualTo(EnrollmentStatus.IN_REVIEW);

        // Test timeout scenario
        when(enrollmentRepository.findById(any()))
            .thenAnswer(invocation -> {
                Thread.sleep(5000); // Simulate delay
                return Optional.of(new Enrollment());
            });

        await()
            .atMost(10, TimeUnit.SECONDS)
            .pollInterval(1, TimeUnit.SECONDS)
            .until(() -> {
                try {
                    enrollmentService.processHealthAssessment(UUID.randomUUID(), assessmentDTO);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            });
    }

    @Test
    void testConcurrentEnrollmentOperations() throws InterruptedException {
        // Prepare concurrent test data
        int concurrentUsers = 10;
        List<EnrollmentDTO> testData = new ArrayList<>();
        for (int i = 0; i < concurrentUsers; i++) {
            testData.add(createTestEnrollmentDTO());
        }

        // Execute concurrent operations
        List<Thread> threads = new ArrayList<>();
        List<Enrollment> results = new ArrayList<>();

        testData.forEach(dto -> {
            Thread t = new Thread(() -> {
                Enrollment e = enrollmentService.createEnrollment(dto);
                synchronized(results) {
                    results.add(e);
                }
            });
            threads.add(t);
            t.start();
        });

        // Wait for completion
        for (Thread t : threads) {
            t.join();
        }

        // Verify results
        assertThat(results).hasSize(concurrentUsers);
        assertThat(results)
            .extracting(Enrollment::getStatus)
            .containsOnly(EnrollmentStatus.DRAFT);
    }

    private EnrollmentDTO createTestEnrollmentDTO() {
        EnrollmentDTO dto = new EnrollmentDTO();
        dto.setBeneficiaryId(UUID.randomUUID());
        dto.setBrokerId(UUID.randomUUID());
        return dto;
    }

    private HealthAssessmentDTO createTestHealthAssessmentDTO() {
        HealthAssessmentDTO dto = new HealthAssessmentDTO();
        // Set required test data
        return dto;
    }
}