package no.amefi.gpttutor.learningplan.repository;

import java.util.ArrayList;
import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import no.amefi.gpttutor.learningplan.LearningPlan;
import no.amefi.gpttutor.learningplan.LearningPlanItem;

@Mapper(componentModel = "spring")
public interface LearningPlanMapper {

    @Mapping(target = "learningPlanItems", expression = "java(toEntityList(learningPlan, learningPlan.learningPlanItems()))")
    LearningPlanEntity toEntity(LearningPlan learningPlan);

    LearningPlan toDomain(LearningPlanEntity learningPlanEntity);

    @Mapping(source = "learningPlanItem.id", target = "id")
    LearningPlanItemEntity toEntity(LearningPlanItem learningPlanItem, LearningPlan learningPlan);

    LearningPlanItem toDomain(LearningPlanItemEntity learningPlanItemEntity);

    default List<LearningPlanItemEntity> toEntityList(LearningPlan learningPlan,
            List<LearningPlanItem> learningPlanItems) {
        List<LearningPlanItemEntity> entities = new ArrayList<>();
        for (LearningPlanItem item : learningPlanItems) {
            LearningPlanItemEntity entity = toEntity(item, learningPlan);
            entities.add(entity);
        }
        return entities;
    }

    List<LearningPlanItem> toDomainList(List<LearningPlanItemEntity> learningPlanItemEntities);

}