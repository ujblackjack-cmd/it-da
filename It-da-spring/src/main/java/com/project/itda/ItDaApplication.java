package com.project.itda;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ItDaApplication {

    public static void main(String[] args) {
        SpringApplication.run(ItDaApplication.class, args);
    }

}
