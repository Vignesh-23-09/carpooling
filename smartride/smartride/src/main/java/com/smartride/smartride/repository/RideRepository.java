package com.smartride.smartride.repository;

import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.entity.User;
import com.smartride.smartride.entity.RideStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByDriver(User driver);

    /**
     * vehicleType is passed as a String (enum.name()) to avoid Hibernate's
     * null-binding issue with enum-typed JPQL parameters.
     * Cast it back to the enum inside the query using the JPQL cast syntax.
     */
    @Query("SELECT r FROM Ride r WHERE " +
           "LOWER(r.source) = LOWER(:source) AND " +
           "LOWER(r.destination) = LOWER(:destination) AND " +
           "r.date = :date AND " +
           "r.availableSeats > 0 AND " +
           "(:minPrice IS NULL OR r.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR r.price <= :maxPrice) AND " +
           "(:vehicleType IS NULL OR CAST(r.vehicleType AS string) = :vehicleType) AND " +
           "(:minRating IS NULL OR r.driver.rating >= :minRating)")
    List<Ride> searchRides(@Param("source") String source,
                           @Param("destination") String destination,
                           @Param("date") LocalDate date,
                           @Param("minPrice") Double minPrice,
                           @Param("maxPrice") Double maxPrice,
                           @Param("vehicleType") String vehicleType,
                           @Param("minRating") Double minRating);

    /**
     * Find all rides for a given date with specific status
     */
    List<Ride> findByDateAndStatus(LocalDate date, RideStatus status);

    /**
     * Find all rides for a driver with specific status
     */
    List<Ride> findByDriverAndStatus(User driver, RideStatus status);
}
