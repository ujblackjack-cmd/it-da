package com.project.itda.global.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class GeocodingService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 카카오 Geocoding API로 주소 → 위도/경도 변환
     */
    public Coordinates getCoordinates(String address) {
        if (address == null || address.trim().isEmpty()) {
            log.warn("⚠️ 주소가 비어있습니다");
            return null;
        }

        try {
            log.info("🔍 Geocoding 요청 - 주소: {}", address);

            RestTemplate restTemplate = new RestTemplate();

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://dapi.kakao.com/v2/local/search/address.json")
                    .queryParam("query", address)
                    .build()
                    .toUriString();

            log.info("🌐 요청 URL: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            log.info("📡 응답 상태: {}", response.getStatusCode());

            if (response.getStatusCode() == HttpStatus.OK) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode documents = root.get("documents");

                log.info("📦 검색 결과 수: {}", documents != null ? documents.size() : 0);

                if (documents != null && documents.isArray() && documents.size() > 0) {
                    JsonNode firstResult = documents.get(0);

                    JsonNode addressNode = firstResult.has("road_address") &&
                            !firstResult.get("road_address").isNull()
                            ? firstResult.get("road_address")
                            : firstResult.get("address");

                    if (addressNode != null) {
                        double latitude = addressNode.get("y").asDouble();
                        double longitude = addressNode.get("x").asDouble();

                        log.info("✅ 주소 변환 성공: {} -> 위도: {}, 경도: {}", address, latitude, longitude);
                        return new Coordinates(latitude, longitude);
                    }
                }
            }

            return null;

        } catch (Exception e) {
            log.error("❌ 주소 변환 실패: {} - {}", address, e.getMessage(), e);
            return null;
        }
    }

    public static class Coordinates {
        private final double latitude;
        private final double longitude;

        public Coordinates(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public double getLatitude() {
            return latitude;
        }

        public double getLongitude() {
            return longitude;
        }
    }
}