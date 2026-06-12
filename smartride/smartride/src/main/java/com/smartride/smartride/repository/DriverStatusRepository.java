package com.smartride.smartride.repository;

import com.smartride.smartride.entity.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverStatusRepository extends JpaRepository<DriverStatus, Long> {

    /**
     * Find all available drivers in a specific city.
     *
     * @param city the current city of the driver
     * @return list of available drivers in the specified city
     */
    List<DriverStatus> findByCurrentCityAndIsAvailableTrue(String city);

    /**
     * Find driver status by driver ID.
     *
     * @param driverId the ID of the driver
     * @return the driver status, if found
     */
    Optional<DriverStatus> findByDriverId(Long driverId);
}
