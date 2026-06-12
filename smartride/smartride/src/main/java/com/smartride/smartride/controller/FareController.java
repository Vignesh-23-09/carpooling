package com.smartride.smartride.controller;

import com.smartride.smartride.dto.FareEstimateRequest;
import com.smartride.smartride.dto.FareResponse;
import com.smartride.smartride.dto.FareEstimationRequest;
import com.smartride.smartride.dto.FareEstimationResponse;
import com.smartride.smartride.dto.CityFareEstimationRequest;
import com.smartride.smartride.service.FareService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fare")
public class FareController {

    private final FareService fareService;

    public FareController(FareService fareService) {
        this.fareService = fareService;
    }

    @PostMapping("/estimate")
    public ResponseEntity<FareResponse> estimateFare(@RequestBody FareEstimateRequest request) {
        FareResponse response = fareService.calculateFare(request.getRideId(), request.getPassengerCount());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/estimation")
    public ResponseEntity<FareEstimationResponse> estimateFareByCoordinates(@RequestBody FareEstimationRequest request) {
        FareEstimationResponse response = fareService.estimateFare(
            request.getPickupLat(),
            request.getPickupLon(),
            request.getDropLat(),
            request.getDropLon()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/estimate-cities")
    public ResponseEntity<FareEstimationResponse> estimateFareByCities(@RequestBody CityFareEstimationRequest request) {
        FareEstimationResponse response = fareService.estimateFareByCities(
            request.getSourceCity(),
            request.getDestinationCity()
        );
        return ResponseEntity.ok(response);
    }
}

